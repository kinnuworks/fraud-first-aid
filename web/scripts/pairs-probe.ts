// Probe: numbers spoken in pairs ("ninety eight forty five"). Murf Falcon speaks the pair words,
// Sarvam saarika:v2.5 transcribes, spokenToDigits parses. Sarvam sometimes keeps the words
// instead of writing numerals, which is why numbers.ts handles two-digit words.
// Synthetic audio: shows transcript formats, not real-caller accuracy.
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/pairs-probe.ts
import { spokenToDigits } from '../lib/entities/numbers';
if (!process.env.MURF_API_KEY || !process.env.SARVAM_API_KEY) throw new Error("MURF_API_KEY and SARVAM_API_KEY must be set");
const MURF = process.env.MURF_API_KEY!, SARVAM = process.env.SARVAM_API_KEY!;
const cases = [
  { d: '9845012345', voice: 'hi-IN-namrita', locale: 'hi-IN', sarvam: 'hi-IN', text: 'मेरा नंबर है अट्ठानवे पैंतालीस शून्य एक तेईस पैंतालीस' },
  { d: '7019283746', voice: 'hi-IN-namrita', locale: 'hi-IN', sarvam: 'hi-IN', text: 'मेरा नंबर है सत्तर उन्नीस अट्ठाईस सैंतीस छियालीस' },
  { d: '9845012345', voice: 'en-IN-anisha', locale: 'te-IN', sarvam: 'te-IN', text: 'నా నంబర్ తొంభై ఎనిమిది నలభై ఐదు సున్నా ఒకటి ఇరవై మూడు నలభై ఐదు' },
  { d: '7019283746', voice: 'en-IN-anisha', locale: 'te-IN', sarvam: 'te-IN', text: 'నా నంబర్ డెబ్బై పందొమ్మిది ఇరవై ఎనిమిది ముప్పై ఏడు నలభై ఆరు' },
  { d: '9845012345', voice: 'kn-IN-harshitha', locale: 'kn-IN', sarvam: 'kn-IN', text: 'ನನ್ನ ನಂಬರ್ ತೊಂಬತ್ತೆಂಟು ನಲವತ್ತೈದು ಸೊನ್ನೆ ಒಂದು ಇಪ್ಪತ್ಮೂರು ನಲವತ್ತೈದು' },
  { d: '9845012345', voice: 'en-IN-anisha', locale: 'en-IN', sarvam: 'en-IN', text: 'My number is ninety eight forty five zero one twenty three forty five' },
];
(async () => { for (const c of cases) {
  const a = await (await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF, 'content-type': 'application/json' }, body: JSON.stringify({ text: c.text, voiceId: c.voice, multiNativeLocale: c.locale, model: 'FALCON', format: 'WAV', sampleRate: 16000 }) })).arrayBuffer();
  const fd = new FormData(); fd.append('file', new Blob([a], { type: 'audio/wav' }), 'a.wav'); fd.append('model', 'saarika:v2.5'); fd.append('language_code', c.sarvam);
  const t = ((await (await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': SARVAM }, body: fd })).json()) as any).transcript;
  const g = spokenToDigits(t); console.log(`${g === c.d ? 'PASS' : 'FAIL'} ${c.sarvam} ${c.d} -> ${g || '(none)'} | ${t}`);
} })();
