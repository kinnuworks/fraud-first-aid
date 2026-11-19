// The shared store for calls, so every server instance sees the same call: Upstash Redis over
// its REST API (Vercel's Upstash integration sets KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_*).
// Errors throw: a call silently missing its state is worse than a failed request.
export type Stored = { c: unknown; seen?: string };
const TTL_SECONDS = 7200; // a call never needs longer; nothing is kept afterwards

export function createShared({ url, token, fetchImpl = fetch }: { url?: string; token?: string; fetchImpl?: typeof fetch }) {
  if (!url || !token) return null;
  const cmd = async (args: string[]) => {
    const r = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`shared store ${args[0]} failed: ${r.status}`);
    return ((await r.json()) as { result: unknown }).result;
  };
  return {
    async get(id: string): Promise<Stored | undefined> {
      const v = await cmd(['GET', `call:${id}`]);
      return typeof v === 'string' ? (JSON.parse(v) as Stored) : undefined;
    },
    async incr(key: string, ttlSeconds: number): Promise<number> {
      const n = Number(await cmd(['INCR', key]));
      if (n === 1) await cmd(['EXPIRE', key, String(ttlSeconds)]);
      return n;
    },
    async put(id: string, c: unknown, seen?: string) {
      await cmd(['SET', `call:${id}`, JSON.stringify({ c, seen }), 'EX', String(TTL_SECONDS)]);
    },
  };
}

export const shared = createShared({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
});
if (!shared && process.env.VERCEL_ENV === 'production') {
  console.error('[store] NO SHARED STORE: calls live in one instance\'s memory and can split across instances');
}
