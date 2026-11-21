// "Watch it call 1930 for you": one click, no microphone, and no complaint to finish first. A labelled
// sample complaint is loaded with every detail confirmed (the same sample as the payment screenshot),
// the 1930 interpreter starts at once, and the page plays the sample 1930 operator's lines into the
// call one at a time (components/ConversationComponent.tsx). Sample data and sample voices only.
import { act, type Complaint } from './session';

// The acknowledgement number the sample operator reads out (operator-4-ack.wav).
export const DEMO_ACK = '31512511200123';

// In order: the operator answers, asks for the UTR, asks for the caller's name (not in the complaint,
// so the interpreter asks the caller, and the sample caller answers in Telugu), then gives the number.
export const DEMO_1930_CLIPS = ['operator-1-hello', 'operator-2-utr', 'operator-3-name', 'victim-8-name', 'operator-4-ack'];

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
  c.phase = 'interpret';
}
