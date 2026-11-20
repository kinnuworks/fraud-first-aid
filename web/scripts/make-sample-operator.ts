// Builds public/demo/operator-*.wav and victim-8-name.wav: ILLUSTRATION clips of a 1930 operator
// (English, Murf Falcon) and the Telugu caller, for the interpreter check. Not real people; the
// acknowledgement number is made up.
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/make-sample-operator.ts
import { existsSync, writeFileSync } from 'fs';
const MURF = process.env.MURF_API_KEY;
if (!MURF) throw new Error('MURF_API_KEY must be set');
const CLIPS: Array<[string, string, string, string]> = [
  ['operator-1-hello', 'Hello, this is the national cyber crime helpline, one nine three zero. How can I help you?', 'en-IN-aarav', 'en-IN'],
  ['operator-2-utr', 'Okay. Please tell me the UTR number of the transaction, and the amount.', 'en-IN-aarav', 'en-IN'],
  ['operator-3-name', 'Thank you. What is the full name of the person who lost the money?', 'en-IN-aarav', 'en-IN'],
  ['victim-8-name', 'నా పేరు లక్ష్మి రెడ్డి.', 'en-IN-anisha', 'te-IN'],
  // the caller confirms the payment time shown on the screenshot (the checks date the screenshot at run time)
  ['victim-6-when-shot', 'స్క్రీన్‌షాట్‌లో ఉన్న సమయమే సరైనది.', 'en-IN-anisha', 'te-IN'],
  ['operator-4-ack', 'Your complaint is registered. Please note the acknowledgement number: three one five one, two five one one, two zero zero one, two three.', 'en-IN-aarav', 'en-IN'],
  // after the interpreter reads the number back: the operator confirms it, or corrects it
  ['operator-5-confirm', "Yes, that's correct.", 'en-IN-aarav', 'en-IN'],
  ['operator-5-correct', "No, that's not right. The acknowledgement number is three one five one, two five one one, two zero zero one, two three.", 'en-IN-aarav', 'en-IN'],
];
async function wav(text: string, voiceId: string, locale: string) {
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF!, 'content-type': 'application/json' }, body: JSON.stringify({ text, voiceId, multiNativeLocale: locale, model: 'FALCON', format: 'WAV', sampleRate: 24000, channelType: 'MONO' }) });
  if (!r.ok) throw new Error(`murf ${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}
(async () => {
  for (const [name, text, voice, locale] of CLIPS) {
    // existing clips stay as they are (earlier runs used them), unless FORCE=1
    if (existsSync(`public/demo/${name}.wav`) && process.env.FORCE !== '1') continue;
    writeFileSync(`public/demo/${name}.wav`, await wav(text, voice, locale));
    console.log('wrote', name);
  }
})();
