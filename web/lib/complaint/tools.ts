// Tools the model calls during the call. Numbers come from the caller's own transcript
// (lastUser), never from text the model writes, so the model cannot alter a digit.
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getComplaint } from './store';
import { recordNumber, correctGroup, confirmField, recordUpi, recordAmount, recordText, missingFields, deadlines, takeFromShot, type FieldName } from './session';
import { lookupIfsc } from './ifsc';
import { YES, NO } from './fastpath';
import { sendPack } from './send';
import { isIfsc } from './fields';

export function complaintTools(session: string, lastUser: string): ToolSet {
  const c = getComplaint(session);
  const all: ToolSet = {
    start_complaint: tool({
      description: 'Switch from listening (guard) to taking the fraud report, when the user asks for help or says money has already gone.',
      inputSchema: z.object({}),
      execute: async () => {
        c.phase = 'complaint';
        return { ok: true };
      },
    }),
    record_utr: tool({
      description: "Record the 12-digit UTR (transaction reference) from the caller's last words. Returns the read-back text to say, group by group.",
      inputSchema: z.object({}),
      execute: async () => {
        // include digits held from earlier turns (UTR said in pieces)
        const r = recordNumber(c, 'utr', `${c.digitBuffer ?? ''} ${lastUser}`);
        if (r.ok) c.digitBuffer = '';
        return r;
      },
    }),
    record_payee: tool({
      description: "Record who the money went to (a UPI ID like name@bank, or a 10-digit mobile) from the caller's last words.",
      inputSchema: z.object({}),
      execute: async () => recordUpi(c, lastUser),
    }),
    record_amount: tool({
      description: "Record the amount lost, in rupees, from the caller's last words.",
      inputSchema: z.object({}),
      execute: async () => recordAmount(c, lastUser),
    }),
    record_when: tool({
      description: 'Record when the payment happened, as an ISO date-time you work out from what the caller said (today is given in the system prompt).',
      inputSchema: z.object({ iso: z.string().describe('e.g. 2026-11-19T14:30') }),
      execute: async ({ iso }) => recordText(c, 'when', iso),
    }),
    record_bank: tool({
      description: "Record the caller's own bank. Pass an IFSC code if they gave one (it is looked up), else the bank name.",
      inputSchema: z.object({ bank_or_ifsc: z.string() }),
      execute: async ({ bank_or_ifsc }) => {
        const v = bank_or_ifsc.replace(/\s+/g, '').toUpperCase();
        if (isIfsc(v)) {
          const b = await lookupIfsc(v);
          if (!b) return { ok: false, problem: 'no bank branch has that IFSC; ask again' };
          return { ...recordText(c, 'victim_bank', `${b.bank}, ${b.branch} (${b.ifsc})`), branch: b };
        }
        return recordText(c, 'victim_bank', bank_or_ifsc);
      },
    }),
    correct_group: tool({
      description: "Replace one read-back group (1-based) of the UTR or payee mobile with the digits in the caller's last words.",
      inputSchema: z.object({ field: z.enum(['utr', 'payee']), group: z.number().int() }),
      execute: async ({ field, group }) => correctGroup(c, field, group, lastUser),
    }),
    take_from_screenshot: tool({
      description: 'Use the value from the payment screenshot the caller uploaded (for a field they did not say, or when the screenshot and their words differ and they agree the screenshot is right). Then read it back.',
      inputSchema: z.object({ field: z.enum(['utr', 'amount', 'payee']) }),
      execute: async ({ field }) => takeFromShot(c, field),
    }),
    record_story: tool({
      description: 'Record how the fraud happened, once they have told you: a one-line English summary for the helpline operator (scam type, what they were asked to do). Their own words are kept from their last turn.',
      inputSchema: z.object({ summary_en: z.string().max(300) }),
      execute: async ({ summary_en }) => {
        // the caller's first telling is kept; later calls refine only the English summary
        c.story = { en: summary_en, words: c.story?.words || lastUser.slice(0, 500) };
        return { ok: true };
      },
    }),
    confirm: tool({
      description: 'Mark a field confirmed after the caller said the read-back is right.',
      inputSchema: z.object({ field: z.enum(['utr', 'amount', 'when', 'payee', 'victim_bank']) }),
      execute: async ({ field }) => confirmField(c, field as FieldName),
    }),
    send_pack_email: tool({
      description: 'Email the finished complaint pack (letter, 1930 script, operator summary, calendar reminders) to the address the caller typed on screen. Call it only after they agree.',
      inputSchema: z.object({}),
      // A critical action: only on the caller's own yes in this turn, never on the model's word alone.
      execute: async () => {
        const t = lastUser.trim().replace(/^[\s,.!।]+/, '');
        if (!YES.test(t) || NO.test(t)) return { needs_yes: true, say: 'Ask the caller: shall I email the pack to the address on screen? Send only after they say yes.' };
        return sendPack(c);
      },
    }),
    status: tool({
      description: 'What is still missing or unconfirmed, and the RBI reporting deadlines once the date is known.',
      inputSchema: z.object({}),
      execute: async () => ({
        missing: missingFields(c),
        deadlines: c.fields.when ? deadlines(c.fields.when.value.slice(0, 10)) : null,
      }),
    }),
  };
  // On guard the model only needs the hand-over; fewer tool schemas means a faster first word.
  return c.phase === 'guard' ? { start_complaint: all.start_complaint } : all;
}
