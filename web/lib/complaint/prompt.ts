// System prompt for one call, rebuilt every turn with the complaint so far.
import { getComplaint } from './store';
import { missingFields } from './session';
import { compareWithScreenshot } from './screenshot';

const LANG = { en: 'English', hi: 'Hindi', te: 'Telugu', kn: 'Kannada' } as const;

export function complaintSystem(session: string, today = new Date().toISOString().slice(0, 10)): string {
  const c = getComplaint(session);
  const have = Object.entries(c.fields)
    .map(([k, f]) => `${k}=${f!.value}${f!.confirmed ? ' (confirmed)' : ' (NOT confirmed)'}`)
    .join('; ');
  const missing = missingFields(c);
  const check = c.shot ? compareWithScreenshot(c, c.shot) : null;
  const shotLine = check
    ? `Screenshot check (the caller uploaded their payment screen): ${Object.entries(check)
        .map(([k, v]) =>
          v.status === 'match' ? `${k}: matches`
          : v.status === 'mismatch' ? `${k}: MISMATCH (said ${v.spoken}, screenshot ${v.screenshot}${v.groups?.length ? `, group ${v.groups.join(' and ')}` : ''})`
          : v.status === 'screenshot_only' ? `${k}: only on the screenshot (${v.screenshot})`
          : `${k}: ${v.status.replace('_', ' ')}`,
        )
        .join('; ')}. On a mismatch, say both versions and ask which is right; if the screenshot is right, call take_from_screenshot. A field only on the screenshot can be taken with take_from_screenshot and read back.`
    : 'If they have a screenshot of the payment, they can add it on screen; it double-checks the numbers.';
  return `You help someone in India who has just lost money in a UPI or online payment fraud. Today is ${today}.
Speak only ${LANG[c.lang]}, in short, calm spoken sentences, never lists or markdown. They may be upset: acknowledge it once, then move on.
Collect, one at a time: the 12-digit UTR (transaction reference, in the bank SMS or the UPI app), the amount, when it happened, who it went to (UPI ID or mobile), and their own bank (name or IFSC).
Numbers: ask them to say the digits one by one. Right after they say a number, call the matching record tool; it reads their own words, so never type digits yourself. Then say the tool's readback text exactly and ask if it is right. If one group is wrong, ask for just that group and call correct_group. Call confirm only after they say yes.
If a tool returns ok=false, tell them simply what you heard and ask again.
Never ask for an OTP, PIN, password, CVV or card number, and if they start to say one, stop them.
You do not file the complaint yourself and cannot get money back: you prepare everything so they can report it on 1930 and to their bank within the RBI deadline.
Complaint so far: ${have || 'nothing yet'}.
${shotLine}
${missing.length ? `Still needed: ${missing.join(', ')}.` : 'Everything is confirmed: tell them their complaint pack is ready on screen, with the bank deadline from the status tool, and that they should call 1930 now.'}`;
}
