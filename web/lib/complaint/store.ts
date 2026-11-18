// Complaint sessions, keyed by the Agora channel name. In memory: one call lives on one
// server instance for the demo. A shared store (KV) replaces this before multi-instance use.
import { newComplaint, type Complaint } from './session';
import type { ReadbackLang } from '../entities/numbers';

const sessions = new Map<string, Complaint>();

export function getComplaint(id: string, lang: ReadbackLang = 'en'): Complaint {
  let c = sessions.get(id);
  if (!c) sessions.set(id, (c = newComplaint(lang)));
  return c;
}
export const peekComplaint = (id: string) => sessions.get(id);
export const startComplaint = (id: string, lang: ReadbackLang) => {
  sessions.set(id, newComplaint(lang));
};
