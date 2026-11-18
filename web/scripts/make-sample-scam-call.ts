// Builds public/demo/sample-scam-call.wav: an ILLUSTRATION of a fake-KYC scam call, spoken by a
// Murf Falcon voice, three lines with pauses, for the scam-call guard demo. Not a real call.
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/make-sample-scam-call.ts
import { writeFileSync } from 'fs';

const MURF = process.env.MURF_API_KEY;
if (!MURF) throw new Error('MURF_API_KEY must be set');
const LINES = [
  'हेलो सर, मैं आपके बैंक के कस्टमर केयर से बोल रहा हूँ।',
  'आपका KYC आज रात expire हो रहा है। update नहीं हुआ तो आपका account block हो जाएगा।',
  'मैं अभी update कर देता हूँ। आपके phone पर एक OTP आया होगा, वो मुझे बता दीजिए।',
];
const RATE = 24000;

async function line(text: string): Promise<Buffer> {
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', {
    method: 'POST',
    headers: { 'api-key': MURF!, 'content-type': 'application/json' },
    body: JSON.stringify({ text, voiceId: 'hi-IN-chirag', multiNativeLocale: 'hi-IN', model: 'FALCON', format: 'WAV', sampleRate: RATE, channelType: 'MONO' }),
  });
  if (!r.ok) throw new Error(`murf ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const wav = Buffer.from(await r.arrayBuffer());
  const data = wav.indexOf('data');
  return wav.subarray(data + 8); // raw 16-bit PCM after the data chunk header
}

(async () => {
  const pause = Buffer.alloc(RATE * 2 * 2); // 2 s of silence, 16-bit mono
  const parts: Buffer[] = [Buffer.alloc(RATE)]; // 0.5 s lead-in
  for (const l of LINES) parts.push(await line(l), pause);
  const pcm = Buffer.concat(parts);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync('public/demo/sample-scam-call.wav', Buffer.concat([h, pcm]));
  console.log(`wrote public/demo/sample-scam-call.wav, ${(pcm.length / RATE / 2).toFixed(1)} s`);
})();
