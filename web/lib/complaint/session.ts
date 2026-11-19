// The complaint being built during one call. Pure state: the model's tools call these
// functions, so numbers are parsed and checked by code, never by the model.
import { spokenToDigits, groupForReadback, readbackText, type ReadbackLang } from '../entities/numbers';
import { isUtr, isMobile, spokenUpiId, parseAmount } from './fields';
import { addBankWorkingDays } from './deadline';
import { scamById } from './scams';

export type FieldName = 'utr' | 'amount' | 'when' | 'payee' | 'victim_bank';
export const REQUIRED: FieldName[] = ['utr', 'amount', 'when', 'payee', 'victim_bank'];

type Field<T> = { value: T; confirmed: boolean };
export type Phase = 'guard' | 'complaint';
export type Flag = { red_flag: string; scam: string; heard: string };
export type Complaint = {
  lang: ReadbackLang;
  // guard: listening to a suspicious call on speaker; complaint: taking the report.
  phase: Phase;
  flags: Flag[];
  // The field most recently read back and waiting for the caller's yes or no.
  pending?: FieldName;
  // Digits of a UTR said in pieces across turns, held until 12 arrive.
  digitBuffer?: string;
  // Turn decisions for debugging (no caller words), filled only when DEBUG_TURNS=1.
  trace?: string[];
  // Where to email the pack (typed on screen), and the result of sending it.
  email?: string;
  emailSent?: { id: string; at: string } | { problem: string };
  // How it happened: a one-line English summary for the operator, and the caller's own words.
  story?: { en: string; words: string };
  // What the payment screenshot showed (second source), if the caller added one.
  shot?: import('./screenshot').Shot;
  fields: Partial<{
    utr: Field<string>;
    amount: Field<number>;
    when: Field<string>;
    payee: Field<string>;
    victim_bank: Field<string>;
  }>;
};

export type Result = { ok: boolean; problem?: string; [k: string]: unknown };

export const newComplaint = (lang: ReadbackLang, phase: Phase = 'complaint'): Complaint => ({ lang, phase, flags: [], fields: {} });

const NUMBER_RULES = {
  utr: { len: 12, check: isUtr, label: 'a UTR has 12' },
  payee: { len: 10, check: isMobile, label: 'a mobile number has 10' },
} as const;
type NumberField = keyof typeof NUMBER_RULES;

function numberResult(c: Complaint, digits: string) {
  const groups = groupForReadback(digits);
  return { ok: true, digits, groups, readback: readbackText(digits, c.lang) };
}

export function recordNumber(c: Complaint, field: NumberField, spoken: string): Result {
  const digits = spokenToDigits(spoken);
  const rule = NUMBER_RULES[field];
  if (!rule.check(digits)) {
    return { ok: false, problem: `heard ${digits.length} digits, ${rule.label}` };
  }
  c.fields[field] = { value: digits, confirmed: false };
  c.pending = field;
  return numberResult(c, digits);
}

// Record already-parsed digits (e.g. a UTR assembled from several turns).
export function recordDigits(c: Complaint, field: NumberField, digits: string): Result {
  if (!NUMBER_RULES[field].check(digits)) return { ok: false, problem: `${digits.length} digits` };
  c.fields[field] = { value: digits, confirmed: false };
  c.pending = field;
  return numberResult(c, digits);
}

// Replace one read-back group (1-based) with newly spoken digits of the same length.
export function correctGroup(c: Complaint, field: NumberField, group: number, spoken: string): Result {
  const f = c.fields[field];
  if (!f) return { ok: false, problem: `${field} not recorded yet` };
  const groups = groupForReadback(f.value);
  if (group < 1 || group > groups.length) return { ok: false, problem: `there are ${groups.length} groups` };
  const digits = spokenToDigits(spoken);
  if (digits.length !== groups[group - 1].length) {
    return { ok: false, problem: `heard ${digits.length} digits, group ${group} has ${groups[group - 1].length}` };
  }
  groups[group - 1] = digits;
  c.fields[field] = { value: groups.join(''), confirmed: false };
  c.pending = field;
  return numberResult(c, groups.join(''));
}

export function confirmField(c: Complaint, field: FieldName): Result {
  const f = c.fields[field];
  if (!f) return { ok: false, problem: `${field} not recorded yet` };
  f.confirmed = true;
  if (c.pending === field) c.pending = undefined;
  return { ok: true };
}

// Payee: a UPI ID ("ramesh at okaxis") or the 10-digit mobile they paid.
export function recordUpi(c: Complaint, spoken: string): Result {
  const id = spokenUpiId(spoken);
  if (!id) return recordNumber(c, 'payee', spoken);
  c.fields.payee = { value: id, confirmed: false };
  c.pending = 'payee';
  return { ok: true, value: id };
}

export function recordAmount(c: Complaint, spoken: string): Result {
  const n = parseAmount(spoken);
  if (n === null || n <= 0) return { ok: false, problem: 'no amount heard; ask for it digit by digit' };
  c.fields.amount = { value: n, confirmed: false };
  c.pending = 'amount';
  return { ok: true, value: n };
}

export function recordText(c: Complaint, field: 'when' | 'victim_bank', value: string): Result {
  const v = value.trim();
  if (!v) return { ok: false, problem: 'empty' };
  c.fields[field] = { value: v, confirmed: false };
  c.pending = field;
  return { ok: true, value: v };
}

export function missingFields(c: Complaint): string[] {
  return REQUIRED.flatMap((f) =>
    !c.fields[f] ? [f] : c.fields[f]!.confirmed ? [] : [`${f} (not confirmed)`],
  );
}

// RBI/2017-18/15: zero liability when the bank is told within 3 working days of its alert;
// beyond 7 working days, liability follows the bank's board-approved policy.
export function deadlines(alertedOn: string, holidays: string[] = []) {
  return {
    zeroLiabilityBy: addBankWorkingDays(alertedOn, 3, holidays),
    boardPolicyAfter: addBankWorkingDays(alertedOn, 7, holidays),
  };
}

// Copy a field the caller didn't say (or wants corrected) from their payment screenshot.
// It stays unconfirmed until they hear the read-back and say yes.
export function takeFromShot(c: Complaint, field: 'utr' | 'amount' | 'payee'): Result {
  const v = c.shot?.[field];
  if (v === undefined) return { ok: false, problem: `the screenshot has no ${field}` };
  if (field === 'utr') {
    c.fields.utr = { value: String(v), confirmed: false };
    c.pending = 'utr';
    return numberResult(c, String(v));
  }
  if (field === 'amount') c.fields.amount = { value: Number(v), confirmed: false };
  else c.fields.payee = { value: String(v), confirmed: false };
  c.pending = field;
  return { ok: true, value: v };
}

// One flag per scam type; unknown ids are ignored.
export function addFlag(c: Complaint, scam: string, red_flag: string, heard: string): boolean {
  if (!scamById(scam) || c.flags.some((f) => f.scam === scam)) return false;
  c.flags.push({ scam, red_flag, heard: heard.slice(0, 300) });
  return true;
}
