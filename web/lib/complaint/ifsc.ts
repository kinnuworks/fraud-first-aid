// IFSC -> bank and branch through Razorpay's public IFSC API (https://ifsc.razorpay.com).
import { isIfsc } from './fields';

export type Branch = { ifsc: string; bank: string; branch: string; city: string; state: string };

// A server error (the API answered 502 for a moment on 20 Nov) is tried again twice, after 300 and
// 600 ms; a 404 means the code doesn't exist.
export async function lookupIfsc(code: string, fetchImpl: typeof fetch = fetch, waitMs = 300): Promise<Branch | null> {
  const ifsc = code.trim().toUpperCase();
  if (!isIfsc(ifsc)) return null;
  let r: Response;
  for (let attempt = 1; ; attempt++) {
    r = await fetchImpl(`https://ifsc.razorpay.com/${ifsc}`);
    if (r.status < 500 || attempt >= 3) break;
    await new Promise((s) => setTimeout(s, waitMs * attempt));
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`IFSC lookup failed: HTTP ${r.status}`);
  const j = (await r.json()) as Record<string, string>;
  return { ifsc: j.IFSC, bank: j.BANK, branch: j.BRANCH, city: j.CITY, state: j.STATE };
}
