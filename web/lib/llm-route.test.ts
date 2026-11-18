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

describe('custom LLM route with complaint tools', () => {
  it('passes the session from ?session= to the tools factory and the tools to the model', async () => {
    let seen: { tools?: unknown; system?: unknown } = {};
    const sessions: string[] = [];
    const route = createLlmRoute({
      secret: 's3cret',
      model: {} as never,
      streamTextImpl: ((opts: { tools?: unknown; system?: unknown }) => {
        seen = opts;
        return { textStream: (async function* () { yield 'ok'; })() };
      }) as never,
      tools: (session) => {
        sessions.push(session);
        return { record_utr: {} } as never;
      },
      system: (session) => `session ${session}`,
    });
    const r = new NextRequest('http://localhost/api/chat/completions?session=chan-42', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
      headers: { 'content-type': 'application/json', authorization: 'Bearer s3cret' },
    });
    expect((await route(r)).status).toBe(200);
    expect(sessions).toEqual(['chan-42']);
    expect(seen.tools).toEqual({ record_utr: {} });
    expect(seen.system).toBe('session chan-42');
  });

  it('rejects a tools request without a session id', async () => {
    const route = createLlmRoute({ secret: 's3cret', model: {} as never, streamTextImpl: (() => ({})) as never, tools: () => ({}) as never });
    const r = new NextRequest('http://localhost/api/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
      headers: { 'content-type': 'application/json', authorization: 'Bearer s3cret' },
    });
    expect((await route(r)).status).toBe(400);
  });
});

describe('silent replies (scam-call guard)', () => {
  const contentOf = async (parts: string[]) => {
    const route = createLlmRoute({ secret: 's3cret', streamTextImpl: fakeStream(parts), model: {} as never });
    const text = await (await route(req({ messages: [{ role: 'user', content: 'x' }] }, 'Bearer s3cret'))).text();
    return text
      .split('\n\n')
      .filter((l) => l.startsWith('data: {'))
      .map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '')
      .join('');
  };
  it('sends no words when the model answers <silent>, even split across chunks', async () => {
    expect(await contentOf(['<sil', 'ent>'])).toBe('');
    expect(await contentOf([' <silent>', ' (nothing to flag)'])).toBe('');
  });
  it('passes ordinary replies through unchanged', async () => {
    expect(await contentOf(['Hang', ' up now.'])).toBe('Hang up now.');
    expect(await contentOf(['<'])).toBe('<');
  });
  it('strips markdown so the voice never reads asterisks or hashes aloud', async () => {
    expect(await contentOf(['Call **19', '30** now. ', '# Done'])).toBe('Call 1930 now. Done');
  });
});

describe('inline markers', () => {
  it('pulls [[flag:id|ask]] markers out of the spoken text, even split across chunks, and reports them', async () => {
    const seen: Array<[string, string, string]> = [];
    const route = createLlmRoute({
      secret: 's3cret',
      model: {} as never,
      streamTextImpl: fakeStream(['[[fla', 'g:fake_kyc|asked for the ', 'OTP]]This is a fake ', 'KYC call. Hang up.']),
      onMarker: (session, id, detail) => seen.push([session, id, detail]),
    });
    const r = new NextRequest('http://localhost/api/chat/completions?session=m1', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }),
      headers: { 'content-type': 'application/json', authorization: 'Bearer s3cret' },
    });
    const text = (await (await route(r)).text())
      .split('\n\n')
      .filter((l) => l.startsWith('data: {'))
      .map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '')
      .join('');
    expect(text).toBe('This is a fake KYC call. Hang up.');
    expect(seen).toEqual([['m1', 'fake_kyc', 'asked for the OTP']]);
  });
});

describe('shortcut replies', () => {
  it('streams the shortcut text without calling the model', async () => {
    let called = false;
    const route = createLlmRoute({
      secret: 's3cret',
      model: {} as never,
      streamTextImpl: (() => {
        called = true;
        return { textStream: (async function* () { yield 'model'; })() };
      }) as never,
      shortcut: (_s, last) => (last.includes('OTP') ? 'Hang up now.' : null),
    });
    const ask = async (content: string) =>
      (await (await route(req({ messages: [{ role: 'user', content }] }, 'Bearer s3cret'))).text())
        .split('\n\n')
        .filter((l) => l.startsWith('data: {'))
        .map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '')
        .join('');
    expect(await ask('tell me the OTP')).toBe('Hang up now.');
    expect(called).toBe(false);
    expect(await ask('hello')).toBe('model');
    expect(called).toBe(true);
  });
});
