import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { createLlmRoute } from './llm-route';

function fakeStream(parts: string[]) {
  return () =>
    ({
      textStream: (async function* () {
        for (const p of parts) yield p;
      })(),
    }) as never;
}

const req = (body: unknown, auth?: string) =>
  new NextRequest('http://localhost/api/chat/completions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
  });

describe('custom LLM route', () => {
  const route = createLlmRoute({ secret: 's3cret', streamTextImpl: fakeStream(['नमस्ते', ' जी']), model: {} as never });

  it('rejects a request without the shared secret', async () => {
    const res = await route(req({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it('rejects a wrong secret', async () => {
    const res = await route(req({ messages: [] }, 'Bearer nope'));
    expect(res.status).toBe(401);
  });

  it('streams OpenAI-style SSE chunks ending in [DONE]', async () => {
    const res = await route(req({ messages: [{ role: 'user', content: 'hi' }] }, 'Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    const text = await res.text();
    const datas = text.split('\n\n').filter(Boolean).map((l) => l.replace(/^data: /, ''));
    expect(datas.at(-1)).toBe('[DONE]');
    const chunks = datas.slice(0, -1).map((d) => JSON.parse(d));
    expect(chunks[0].choices[0].delta.role).toBe('assistant');
    expect(chunks.map((c) => c.choices[0].delta.content ?? '').join('')).toBe('नमस्ते जी');
    expect(chunks.at(-1).choices[0].finish_reason).toBe('stop');
  });
});
