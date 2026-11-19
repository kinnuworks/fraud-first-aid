# Spoken payment references in ten Indian languages

A small open benchmark for one hard step in reporting UPI fraud by voice: getting a 12-digit UTR (transaction reference) or a 10-digit mobile number exactly right from speech.

- 30 numbers per language (15 UTRs, 15 mobiles, fixed seed), in Telugu, Hindi, Kannada, Tamil, Malayalam, Bengali, Marathi, Gujarati, Punjabi and English.
- Each spoken digit by digit by a Murf Falcon voice for that language, in three conditions: clean, white noise at 10 dB SNR, and the G.711 mu-law 8 kHz phone codec. 900 clips.
- [`references.csv`](references.csv): every clip's id, language, condition, the reference digits and the exact text spoken.
- The audio isn't redistributed. [`make.ts`](make.ts) regenerates all 900 clips with your own Murf API key; [`score.ts`](score.ts) transcribes them with Sarvam saarika:v2.5 and scores two readers of the same transcript: the numerals the speech-to-text writes (the baseline), and UTR Pakka's number layer.

The question, metric and rule were written before any run ([`EVAL_PLAN.md`](../EVAL_PLAN.md), ninth claim). Synthetic voices: this measures the number step, not real callers.

```bash
set -a; . web/.env.local; set +a     # MURF_API_KEY and a Sarvam key
npx tsx evidence/benchmark/make.ts
npx tsx evidence/benchmark/score.ts
python3 -I evidence/interval.py diff evidence/results/benchmark-<date>.csv ours baseline
```
