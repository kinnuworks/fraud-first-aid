// OpenAI-compatible Chat Completions endpoint that Agora's Conversational AI Engine
// calls as its custom LLM (llm.url). Guarded by a shared secret that Agora sends as
// its LLM api_key (Authorization: Bearer <secret>), so nobody else can spend tokens.
import { NextRequest, NextResponse } from "next/server";
import {
  stepCountIs,
  type streamText,
  type LanguageModel,
  type ToolSet,
} from "ai";
import { randomUUID, timingSafeEqual } from "crypto";

type Deps = {
  secret: string | undefined;
  model: LanguageModel;
  streamTextImpl: typeof streamText;
  // A fixed system prompt, or one built per session (the complaint so far).
  system?: string | ((session: string) => string);
  // Server-side tools bound to one call's session (?session=<id> on llm.url).
  // lastUser: the caller's latest transcript, so number tools read the ASR text itself.
  tools?: (session: string, lastUser: string) => ToolSet;
  // Called first with the URL's query, so a session can be (re)created with its language and mode.
  init?: (session: string, params: URLSearchParams) => void;
  // Inline markers the model writes before speaking, e.g. [[flag:fake_kyc|asked for the OTP]]:
  // removed from the spoken text and reported here (saves a tool round-trip).
  onMarker?: (
    session: string,
    id: string,
    detail: string,
    lastUser: string,
  ) => void;
  // A fixed reply to speak at once instead of calling the model (the guard's red-flag rules).
  shortcut?: (session: string, lastUser: string) => string | null;
};

function authorized(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const SILENT = "<silent>";

// Last user message seen per session (see the append behaviour in the route).
const seenUser = new Map<string, string>();

export function createLlmRoute({
  secret,
  model,
  streamTextImpl,
  system,
  tools,
  init,
  onMarker,
  shortcut,
}: Deps) {
  return async function POST(request: NextRequest) {
    if (!authorized(request.headers.get("authorization"), secret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    let body: { messages?: Array<{ role: string; content: unknown }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const session = request.nextUrl.searchParams.get("session") ?? "";
    if (tools && !/^[\w-]{1,64}$/.test(session)) {
      return NextResponse.json(
        { error: "missing or bad session" },
        { status: 400 },
      );
    }
    init?.(session, request.nextUrl.searchParams);
    const msgs = body.messages ?? [];
    const last = [...msgs].reverse().find((m) => m.role === "user")?.content;
    const whole = typeof last === "string" ? last : "";
    // After a silent reply Agora appends the next utterance to the same user message, so pass on
    // only the words this session hasn't seen yet.
    const prev = seenUser.get(session) ?? "";
    const lastUser =
      prev && whole.startsWith(prev) && whole.length > prev.length ? whole.slice(prev.length) : whole;
    seenUser.set(session, whole);
    const fixed = shortcut?.(session, lastUser) ?? null;
    const result =
      fixed !== null
        ? {
            textStream: (async function* () {
              yield fixed;
            })(),
          }
        : streamTextImpl({
            model,
            system: typeof system === "function" ? system(session) : system,
            messages: msgs.filter((m) => m.role !== "system") as never,
            ...(tools
              ? { tools: tools(session, lastUser), stopWhen: stepCountIs(6) }
              : {}),
          });

    const enc = new TextEncoder();
    const id = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);
    const chunk = (
      delta: Record<string, unknown>,
      finish: string | null = null,
    ) =>
      enc.encode(
        `data: ${JSON.stringify({
          id,
          object: "chat.completion.chunk",
          created,
          model: "custom",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(chunk({ role: "assistant", content: "" }));
          // A reply that starts with <silent> is dropped whole, so the agent says nothing
          // (the scam-call guard listens without talking over the call).
          // Spoken output: no markdown symbols for the voice to read out.
          const plain = (t: string) =>
            t.replace(/[*_`]+/g, "").replace(/(^|\n|\. )#+\s*/g, "$1");
          let pending = "";
          const say = (t: string) => {
            if (t) controller.enqueue(chunk({ content: plain(t) }));
          };
          const feed = (t: string, end = false) => {
            pending += t;
            for (;;) {
              const open = pending.indexOf("[[");
              if (open < 0) {
                // keep a lone trailing "[" in case it starts a marker in the next chunk
                const keep = !end && pending.endsWith("[") ? 1 : 0;
                say(pending.slice(0, pending.length - keep));
                pending = pending.slice(pending.length - keep);
                return;
              }
              say(pending.slice(0, open));
              pending = pending.slice(open);
              const close = pending.indexOf("]]");
              if (close < 0) {
                if (end) {
                  say(pending);
                  pending = "";
                }
                return;
              }
              const m = pending
                .slice(2, close)
                .match(/^flag:([a-z_]+)\|([\s\S]*)$/);
              if (m) onMarker?.(session, m[1], m[2].trim(), lastUser);
              pending = pending.slice(close + 2).replace(/^\s+/, "");
            }
          };
          // A reply that starts with <silent> is dropped whole, so the agent says nothing
          // (the scam-call guard listens without talking over the call).
          let head = "";
          let decided: "speak" | "silent" | null = null;
          for await (const part of result.textStream) {
            if (decided === "silent") continue;
            if (decided === "speak") {
              feed(part);
              continue;
            }
            head += part;
            const t = head.trimStart();
            if (t.startsWith(SILENT)) decided = "silent";
            else if (t.length >= SILENT.length || !SILENT.startsWith(t)) {
              decided = "speak";
              feed(head);
            }
          }
          if (decided === null && head && !head.trimStart().startsWith(SILENT))
            feed(head);
          if (decided !== "silent") feed("", true);
          controller.enqueue(chunk({}, "stop"));
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[llm-route] stream error:", err);
          controller.error(err);
        }
      },
    });
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  };
}
