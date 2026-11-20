// Starting a call starts a paid Agora agent, so starts are limited: 20 per address every ten
// minutes (a venue shares one address), and 300 an hour for the whole app. Counters live in the shared store; if the
// store fails, the call starts anyway (a victim is never blocked by our outage).
import { shared } from './complaint/shared';

type Incr = (key: string, ttlSeconds: number) => Promise<number>;

export function createLimiter({ incr, perAddress = 20, perHour = 300, prefix = 'rl:start' }: { incr: Incr; perAddress?: number; perHour?: number; prefix?: string }) {
  return async function allow(address: string): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    try {
      const mine = await incr(`${prefix}:${address}:${Math.floor(now / 600)}`, 700);
      if (mine > perAddress) return false;
      const all = await incr(`${prefix}:all:${Math.floor(now / 3600)}`, 3700);
      return all <= perHour;
    } catch (e) {
      console.error('[ratelimit] store failed, allowing:', e);
      return true;
    }
  };
}

const memory = new Map<string, number>();
const incr: Incr = shared
  ? (key, ttl) => shared!.incr(key, ttl)
  : async (key) => {
      const n = (memory.get(key) ?? 0) + 1;
      memory.set(key, n);
      if (memory.size > 5000) memory.delete(memory.keys().next().value as string);
      return n;
    };
export const allowStart = createLimiter({ incr });
// The 'Try to fool the guard' box on /proof: each try is a few model calls, so 30 tries per address
// every ten minutes and 600 an hour for the whole app.
export const allowTry = createLimiter({ incr, perAddress: 30, perHour: 600, prefix: 'rl:try' });

// The caller's address as Vercel passes it (the first entry of x-forwarded-for). An IPv6 address
// counts by its /64, which one subscriber usually holds whole.
export const clientAddress = (h: Headers) => {
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  if (!ip.includes(':')) return ip;
  const parts = ip.split('::')[0].split(':').filter(Boolean);
  return `${parts.slice(0, 4).join(':')}::/64`;
};
