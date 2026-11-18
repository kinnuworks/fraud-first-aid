// OpenAI-compatible Chat Completions endpoint that Agora's Conversational AI Engine
// calls as its custom LLM (llm.url). Guarded by a shared secret that Agora sends as
// its LLM api_key (Authorization: Bearer <secret>), so nobody else can spend tokens.
import { NextRequest, NextResponse } from 'next/server';
import { stepCountIs, type streamText, type LanguageModel, type ToolSet } from 'ai';
import { randomUUID, timingSafeEqual } from 'crypto';

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
};

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const SILENT = '<silent>';

export function createLlmRoute({ secret, model, streamTextImpl, system, tools, init }: Deps) {
  return async function POST(request: NextRequest) {
    if (!authorized(request.headers.get('authorization'), secret)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let body: { messages?: Array<{ role: string; content: unknown }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const session = request.nextUrl.searchParams.get('session') ?? '';
    if (tools && !/^[\w-]{1,64}$/.test(session)) {
      return NextResponse.json({ error: 'missing or bad session' }, { status: 400 });
    }
    init?.(session, request.nextUrl.searchParams);
    const msgs = body.messages ?? [];
    const last = [...msgs].reverse().find((m) => m.role === 'user')?.content;
    const lastUser = typeof last === 'string' ? last : '';
    const result = streamTextImpl({
      model,
      system: typeof system === 'function' ? system(session) : system,
      messages: msgs.filter((m) => m.role !== 'system') as never,
      ...(tools ? { tools: tools(session, lastUser), stopWhen: stepCountIs(6) } : {}),
    });

    const enc = new TextEncoder();
    const id = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);
    const chunk = (delta: Record<string, unknown>, finish: string | null = null) =>
      enc.encode(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model: 'custom',
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(chunk({ role: 'assistant', content: '' }));
          // A reply that starts with <silent> is dropped whole, so the agent says nothing
          // (the scam-call guard listens without talking over the call).
          // Spoken output: no markdown symbols for the voice to read out.
          const plain = (t: string) => t.replace(/[*_`]+/g, '').replace(/(^|\n|\. )#+\s*/g, '$1');
          let head = '';
          let decided: 'speak' | 'silent' | null = null;
          for await (const part of result.textStream) {
            if (decided === 'silent') continue;
            if (decided === 'speak') {
              controller.enqueue(chunk({ content: plain(part) }));
              continue;
            }
            head += part;
            const t = head.trimStart();
            if (t.startsWith(SILENT)) decided = 'silent';
            else if (t.length >= SILENT.length || !SILENT.startsWith(t)) {
              decided = 'speak';
              controller.enqueue(chunk({ content: plain(head) }));
            }
          }
          if (decided === null && head && !head.trimStart().startsWith(SILENT)) controller.enqueue(chunk({ content: plain(head) }));
          controller.enqueue(chunk({}, 'stop'));
          controller.enqueue(enc.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[llm-route] stream error:', err);
          controller.error(err);
        }
      },
    });
    return new NextResponse(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  };
}
