// Starting a call starts a paid Agora agent, so starts are limited: 20 per address every ten
// minutes (a venue shares one address), and 300 an hour for the whole app. Counters live in the shared store; if the
// store fails, the call starts anyway (a victim is never blocked by our outage).
import { shared } from './complaint/shared';

type Incr = (key: string, ttlSeconds: number) => Promise<number>;

export function createLimiter({ incr, perAddress = 20, perHour = 300 }: { incr: Incr; perAddress?: number; perHour?: number }) {
  return async function allow(address: string): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    try {
      const mine = await incr(`rl:start:${address}:${Math.floor(now / 600)}`, 700);
      if (mine > perAddress) return false;
      const all = await incr(`rl:start:all:${Math.floor(now / 3600)}`, 3700);
      return all <= perHour;
    } catch (e) {
      console.error('[ratelimit] store failed, allowing:', e);
      return true;
    }
  };
}

const memory = new Map<string, number>();
export const allowStart = createLimiter({
  incr: shared
    ? (key, ttl) => shared!.incr(key, ttl)
    : async (key) => {
        const n = (memory.get(key) ?? 0) + 1;
        memory.set(key, n);
        if (memory.size > 5000) memory.delete(memory.keys().next().value as string);
        return n;
      },
});

// The caller's address as Vercel passes it (the first entry of x-forwarded-for).
export const clientAddress = (h: Headers) => (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
