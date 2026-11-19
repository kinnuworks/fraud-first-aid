// Complaint sessions, keyed by the Agora channel name. In memory: one call lives on one
// server instance for the demo. A shared store (KV) replaces this before multi-instance use.
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
