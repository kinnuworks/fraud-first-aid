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
// Each running turn adds one hold; the copy is newer than the store's until every turn on it has
// saved (an interrupted reply and the next turn overlap). Holds lapse after a minute.
const writing = new Map<string, { n: number; until: number }>();
export const hold = (id: string) => {
  const w = writing.get(id);
  writing.set(id, { n: (w && w.until > Date.now() ? w.n : 0) + 1, until: Date.now() + 60_000 });
  if (writing.size > MAX) writing.delete(writing.keys().next().value as string);
};
export const release = (id: string) => {
  const w = writing.get(id);
  if (!w) return;
  if (w.n <= 1) writing.delete(id);
  else w.n -= 1;
};

export async function hydrate(id: string): Promise<string | undefined> {
  if (!shared) return undefined;
  const w = writing.get(id);
  if (w && w.until > Date.now() && sessions.has(id)) return seen.get(id);
  if (w) writing.delete(id);
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
  if (now) mergeNewer(c, now);
  await shared.put(id, c, seen.get(id));
}

const PHASE_ORDER = { guard: 0, complaint: 1, interpret: 2 } as const;
// Another instance may have saved the call after this one loaded it (two turns overlapping, the
// screenshot or email request, the interpreter starting). Keep what it added: the later phase, a
// confirmed field over an unconfirmed or missing one, every flag and step, and the request-made fields.
export function mergeNewer(c: Complaint, now: Partial<Complaint>): void {
  for (const k of ['shot', 'email', 'emailSent', 'ack1930', 'story', 'agentId'] as const) {
    if (c[k] === undefined && now[k] !== undefined) (c as Record<string, unknown>)[k] = now[k];
  }
  if (now.phase && PHASE_ORDER[now.phase] > PHASE_ORDER[c.phase]) c.phase = now.phase;
  if (now.startedOnGuard) c.startedOnGuard = true;
  for (const [k, f] of Object.entries(now.fields ?? {}) as Array<[keyof Complaint['fields'], { value: never; confirmed: boolean }]>) {
    const mine = c.fields[k];
    if (!mine || (f.confirmed && !mine.confirmed)) (c.fields as Record<string, unknown>)[k] = f;
  }
  for (const fl of now.flags ?? []) if (!c.flags.some((x) => x.scam === fl.scam)) c.flags.push(fl);
  if (now.actions?.length) {
    const have = new Set((c.actions ?? []).map((a) => `${a.at}|${a.text}`));
    const add = now.actions.filter((a) => !have.has(`${a.at}|${a.text}`));
    if (add.length) c.actions = [...(c.actions ?? []), ...add].sort((a, b) => a.at.localeCompare(b.at)).slice(-40);
  }
  if ((now.heard?.length ?? 0) > (c.heard?.length ?? 0)) c.heard = now.heard;
  if (now.reportedPayee) c.reportedPayee = true;
}
