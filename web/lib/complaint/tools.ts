// Tools the model calls during the call. Numbers come from the caller's own transcript
// (lastUser), never from text the model writes, so the model cannot alter a digit.
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getComplaint } from './store';
import { recordNumber, correctGroup, confirmField, recordUpi, recordAmount, recordText, missingFields, deadlines, type FieldName } from './session';
import { lookupIfsc } from './ifsc';
import { isIfsc } from './fields';

export function complaintTools(session: string, lastUser: string): ToolSet {
  const c = getComplaint(session);
  return {
    record_utr: tool({
      description: "Record the 12-digit UTR (transaction reference) from the caller's last words. Returns the read-back text to say, group by group.",
      inputSchema: z.object({}),
      execute: async () => recordNumber(c, 'utr', lastUser),
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
    confirm: tool({
      description: 'Mark a field confirmed after the caller said the read-back is right.',
      inputSchema: z.object({ field: z.enum(['utr', 'amount', 'when', 'payee', 'victim_bank']) }),
      execute: async ({ field }) => confirmField(c, field as FieldName),
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
}
