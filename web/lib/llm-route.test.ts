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

describe('only the new words reach the tools', () => {
  it('after a silent reply, Agora appends to the same user message; tools and shortcuts see just the new part', async () => {
    const seen: string[] = [];
    const route = createLlmRoute({
      secret: 's3cret',
      model: {} as never,
      streamTextImpl: fakeStream(['<silent>']),
      shortcut: (_s, last) => {
        seen.push(last);
        return '<silent>';
      },
    });
    const send = (content: string) =>
      route(
        new NextRequest('http://localhost/api/chat/completions?session=acc1', {
          method: 'POST',
          body: JSON.stringify({ messages: [{ role: 'user', content }] }),
          headers: { 'content-type': 'application/json', authorization: 'Bearer s3cret' },
        }),
      ).then((r) => r.text());
    await send('four zero two one');
    await send('four zero two one seven seven eight eight');
    await send('four zero two one seven seven eight eight nine nine one zero');
    expect(seen).toEqual(['four zero two one', ' seven seven eight eight', ' nine nine one zero']);
    // a genuinely new message is passed whole
    await send('yes');
    expect(seen.at(-1)).toBe('yes');
  });
});

describe('custom LLM route with a shared store', () => {
  it('loads the call before init, and saves it with the words seen after the reply finishes', async () => {
    const order: string[] = [];
    let saved: { session: string; seen: string } | null = null;
    const route = createLlmRoute({
      secret: 's3cret',
      model: {} as never,
      streamTextImpl: fakeStream(['ok']),
      tools: () => ({}),
      load: async (session) => { order.push(`load:${session}`); return 'hello'; },
      init: (session) => { order.push(`init:${session}`); },
      shortcut: (_s, lastUser) => { order.push(`turn:${lastUser}`); return null; },
      save: async (session, seen) => { order.push('save'); saved = { session, seen }; },
    });
    const res = await route(new NextRequest('http://localhost/api/chat/completions?session=up-1', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello my UTR is' }] }),
      headers: { 'content-type': 'application/json', authorization: 'Bearer s3cret' },
    }));
    await res.text();
    // the words seen on another instance ('hello') come from the store, so only the new words count
    expect(order).toEqual(['load:up-1', 'init:up-1', 'turn: my UTR is', 'save']);
    expect(saved).toEqual({ session: 'up-1', seen: 'hello my UTR is' });
  });
});

describe('custom LLM route reports what was spoken', () => {
  it('passes the spoken text to onReply, and nothing for a silent turn', async () => {
    const got: string[] = [];
    const mk = (parts: string[]) => createLlmRoute({ secret: 's3cret', model: {} as never, streamTextImpl: fakeStream(parts), onReply: (_s, t) => { got.push(t); } });
    const call = (r: ReturnType<typeof mk>) => r(new NextRequest('http://localhost/api/chat/completions?session=up-2', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }), headers: { 'content-type': 'application/json', authorization: 'Bearer s3cret' } })).then((res) => res.text());
    await call(mk(['[[flag:x|y]] Hang', ' up now.']));
    await call(mk(['<silent>']));
    expect(got).toEqual(['Hang up now.']);
  });
});

// From the ICFD validation split, 20 Nov: with its own silent turns left empty in the history,
// the guard model kept answering <silent> through a plain "pay ₹7,500 to our Mobikwik ID";
// with them written as <silent> it warned (2 of 2 tries). The model sees what it really said.
describe('history: silent turns', () => {
  it('gives the model <silent> for an empty assistant turn', async () => {
    let seen: Array<{ role: string; content: unknown }> = [];
    const route = createLlmRoute({
      secret: 's3cret',
      model: {} as never,
      streamTextImpl: ((opts: { messages: typeof seen }) => {
        seen = opts.messages;
        return { textStream: (async function* () { yield 'ok'; })() };
      }) as never,
    });
    const messages = [
      { role: 'user', content: 'Caller: hello' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Me: who is this' },
      { role: 'assistant', content: '  ' },
      { role: 'user', content: 'Caller: pay to our Mobikwik ID' },
    ];
    expect((await route(req({ messages }, 'Bearer s3cret'))).status).toBe(200);
    expect(seen.filter((m) => m.role === 'assistant').map((m) => m.content)).toEqual(['<silent>', '<silent>']);
  });
});
