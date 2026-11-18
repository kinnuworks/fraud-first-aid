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
};

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createLlmRoute({ secret, model, streamTextImpl, system, tools }: Deps) {
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
          for await (const part of result.textStream) controller.enqueue(chunk({ content: part }));
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
