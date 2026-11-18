// IFSC -> bank and branch through Razorpay's public IFSC API (https://ifsc.razorpay.com).
import { isIfsc } from './fields';

export type Branch = { ifsc: string; bank: string; branch: string; city: string; state: string };

export async function lookupIfsc(code: string, fetchImpl: typeof fetch = fetch): Promise<Branch | null> {
  const ifsc = code.trim().toUpperCase();
  if (!isIfsc(ifsc)) return null;
  const r = await fetchImpl(`https://ifsc.razorpay.com/${ifsc}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`IFSC lookup failed: HTTP ${r.status}`);
  const j = (await r.json()) as Record<string, string>;
  return { ifsc: j.IFSC, bank: j.BANK, branch: j.BRANCH, city: j.CITY, state: j.STATE };
}
