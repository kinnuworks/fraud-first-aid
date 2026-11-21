// "Watch it call 1930 for you": one click, no microphone, and no complaint to finish first. A labelled
// sample complaint is loaded with every detail confirmed (the same sample as the payment screenshot),
// the page starts the 1930 interpreter through 'Speak to 1930 for me' at once, and plays the sample 1930 operator's lines into the
// call one at a time (components/ConversationComponent.tsx). Sample data and sample voices only.
import { act, type Complaint } from './session';

// The acknowledgement number the sample operator reads out (operator-4-ack.wav).
export const DEMO_ACK = '31512511200123';

// In order: the operator answers, asks for the UTR, asks for the caller's name (not in the complaint,
// so the interpreter asks the caller, and the sample caller answers in Telugu), then gives the number.
// (no separate UTR question: the interpreter's opening summary already gives the UTR)
export const DEMO_1930_CLIPS = ['operator-1-hello', 'operator-3-name', 'victim-8-name', 'operator-4-ack'];

// The operator's answer to the interpreter's read-back: a real operator confirms an exact number and
// corrects a wrong one (live speech recognition can slip a digit; the read-back is how it gets fixed).
export function operatorReply(heard: string): 'operator-5-confirm' | 'operator-5-correct' | null {
  if (!heard) return null;
  return heard === DEMO_ACK ? 'operator-5-confirm' : 'operator-5-correct';
}

export function seedDemo1930(c: Complaint, today: string) {
  const yes = <T,>(value: T) => ({ value, confirmed: true });
  c.fields = {
    utr: yes('402177869910'),
    amount: yes(25000),
    when: yes(`${today}T09:30`),
    payee: yes('ramesh@okaxis'),
    victim_bank: yes('State Bank of India'),
  };
  act(
    c,
    'done',
    'Loaded a sample complaint for the 1930 demo (sample data): Rs 25,000 to ramesh@okaxis at 9:30 am today, UTR 4021 7786 9910, State Bank of India, every detail confirmed',
  );
}

// "Watch it take a complaint": the labelled sample caller (Telugu) in a live complaint call. Each line
// plays after the agent has answered the one before; 'screenshot' adds the sample payment screenshot
// (public/demo/sample-payment-today.png: 21 Nov 2026, 9:30 am) through the card's own upload, so the
// screenshot check and Agora's speak cut-in run for real. Extra "yes" lines follow until the pack shows.
export const DEMO_COMPLAINT_STEPS = [
  'victim-1-lost',
  'victim-2-utr',
  'screenshot',
  'victim-3-screenshot-right',
  'victim-4-yes',
  'victim-5-payee',
  'victim-4-yes',
  'victim-6-when-shot',
  'victim-4-yes',
  'victim-7-bank',
  'victim-4-yes',
];

// The 1930 demo's clips for the caller's language: the operator speaks English; the sample caller
// answers the name question in Hindi or Telugu.
export function demo1930Clips(lang: string): string[] {
  return lang === 'hi' ? DEMO_1930_CLIPS.map((c) => (c === 'victim-8-name' ? 'victim-8-name-hi' : c)) : DEMO_1930_CLIPS;
}

// After the UTR and the screenshot: the sample caller's next line, from the call's state. A detail read
// back and not yet confirmed gets a yes; otherwise the first missing detail gets its line.
type DemoState = { fields?: Record<string, { value: unknown; confirmed: boolean } | undefined>; missing?: string[] };
export function nextComplaintClip(st: DemoState): string | null {
  const missing = st.missing ?? [];
  if (!missing.length) return null;
  if (Object.values(st.fields ?? {}).some((f) => f && !f.confirmed)) return 'victim-4-yes';
  // the screenshot already holds the amount and the UPI ID: the caller backs them, which speech-to-text
  // can't mishear the way it can a spoken UPI ID ('okaxis')
  if (missing.includes('amount')) return 'victim-9-amount-shot';
  if (missing.includes('payee')) return 'victim-5-payee-shot';
  if (missing.includes('when')) return 'victim-6-when-shot';
  if (missing.includes('victim_bank')) return 'victim-7-bank';
  return 'victim-4-yes';
}

// "Watch it catch a scam call": the sample scam call in the chosen language where one exists. The guard
// hears in the chosen language, so a Kannada listener gets the Kannada call; everyone else the Hindi one.
export function scamClipFor(lang: string | null): string {
  return lang === 'kn' ? '/demo/sample-scam-call-kn.wav' : '/demo/sample-scam-call.wav';
}

// The short complaint demo: what happened is noted up front (labelled sample), so the caller's first
// line is the UTR with one group wrong; the screenshot and Agora's cut-in follow within about 40 s.
export const DEMO_COMPLAINT_FAST = ['victim-2-utr', 'screenshot', 'victim-3-screenshot-right'];

export function seedDemoStory(c: Complaint) {
  c.story = {
    en: 'A caller posing as the bank said the KYC would expire tonight and had the victim scan a QR code; Rs 25,000 was paid.',
    words: '',
  };
  act(c, 'heard', 'Understood what happened (sample data): a fake KYC call; Rs 25,000 paid after scanning a QR code');
}
