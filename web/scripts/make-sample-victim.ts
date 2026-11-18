// Builds public/demo/victim-*.wav: ILLUSTRATION clips of a caller (Telugu, Murf Falcon voice) for the
// recorded full-flow demo. Each file is one turn. Not a real person.
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/make-sample-victim.ts
import { writeFileSync } from 'fs';
const MURF = process.env.MURF_API_KEY;
if (!MURF) throw new Error('MURF_API_KEY must be set');
const TURNS: Record<string, string> = {
  '1-lost': 'అయ్యో, నేను ఇప్పటికే ఇరవై ఐదు వేల రూపాయలు పంపేశాను. KYC అని చెప్పి QR స్కాన్ చేయించారు. నాకు ఫిర్యాదు చేయాలి.',
  '2-utr': 'UTR నంబర్. నాలుగు, సున్నా, రెండు, ఒకటి. ఏడు, ఏడు, ఎనిమిది, ఎనిమిది. తొమ్మిది, తొమ్మిది, ఒకటి, సున్నా.',
  '3-screenshot-right': 'స్క్రీన్‌షాట్‌లో ఉన్నదే సరైనది.',
  '4-yes': 'అవును, సరిగ్గా ఉంది.',
  '5-payee': 'డబ్బు ramesh at okaxis కి వెళ్ళింది.',
  '6-when': 'ఈ రోజు మధ్యాహ్నం రెండున్నర గంటలకు.',
  '7-bank': 'నా బ్యాంక్ స్టేట్ బ్యాంక్ ఆఫ్ ఇండియా.',
};
const RATE = 24000;
async function wav(text: string) {
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF!, 'content-type': 'application/json' }, body: JSON.stringify({ text, voiceId: 'en-IN-anisha', multiNativeLocale: 'te-IN', model: 'FALCON', format: 'WAV', sampleRate: RATE, channelType: 'MONO' }) });
  if (!r.ok) throw new Error(`murf ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
(async () => {
  for (const [k, t] of Object.entries(TURNS)) {
    writeFileSync(`public/demo/victim-${k}.wav`, await wav(t));
    console.log('wrote', k);
  }
})();
