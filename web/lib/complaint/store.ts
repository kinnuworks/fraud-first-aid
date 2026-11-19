// Complaint sessions, keyed by the Agora channel name: this instance's copy of each call, loaded
// from and saved to the shared store (below) on every request.
import { newComplaint, type Complaint, type Phase } from './session';
import type { ReadbackLang } from '../entities/numbers';

const sessions = new Map<string, Complaint>();
const MAX = 500; // bounded: oldest calls drop out first
const bound = () => {
  if (sessions.size > MAX) sessions.delete(sessions.keys().next().value as string);
};

export function getComplaint(id: string, lang: ReadbackLang = 'en', phase: Phase = 'complaint'): Complaint {
  let c = sessions.get(id);
  if (!c) {
    sessions.set(id, (c = newComplaint(lang, phase)));
    bound();
  }
  return c;
}
export const peekComplaint = (id: string) => sessions.get(id);
export const startComplaint = (id: string, lang: ReadbackLang, phase: Phase = 'complaint') => {
  sessions.set(id, newComplaint(lang, phase));
  bound();
};

// Shared across server instances (see shared.ts). Each request loads the call first and saves
// it after changing it; without a store these do nothing and the memory above is all there is.
import { shared } from './shared';
const seen = new Map<string, string>();

// While a voice turn on this instance is changing the call, this copy is newer than the store's:
// a poll or another request must not load the store over it. A hold ends when the turn saves,
// or after a minute if the turn never finished.
const writing = new Map<string, number>();
export const hold = (id: string) => writing.set(id, Date.now() + 60_000);
export const release = (id: string) => writing.delete(id);

export async function hydrate(id: string): Promise<string | undefined> {
  if (!shared) return undefined;
  if ((writing.get(id) ?? 0) > Date.now() && sessions.has(id)) return seen.get(id);
  const s = await shared.get(id);
  if (!s) return undefined;
  sessions.set(id, s.c as Complaint);
  bound();
  if (s.seen !== undefined) seen.set(id, s.seen);
  return s.seen;
}

export async function persist(id: string, seenText?: string): Promise<void> {
  if (seenText !== undefined) seen.set(id, seenText);
  const c = sessions.get(id);
  if (!shared || !c) return;
  // The screenshot and email requests run beside the voice turns; keep what they stored even if
  // this instance loaded the call before they finished.
  const now = (await shared.get(id))?.c as Partial<Complaint> | undefined;
  if (now) for (const k of ['shot', 'email', 'emailSent'] as const) if (c[k] === undefined && now[k] !== undefined) (c as Record<string, unknown>)[k] = now[k];
  await shared.put(id, c, seen.get(id));
}
