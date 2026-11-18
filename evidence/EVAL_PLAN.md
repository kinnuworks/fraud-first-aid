# Evaluation plan

This plan is written and committed before any evaluation run. The commit hash and time of this file show that the question, the data, the baseline and the success rule were fixed before any result existed. If something has to change after a run, the change goes under "Changes after the first run" with its reason, and the original lines stay as they were.

There are no real users in this evaluation. Nobody was recruited, messaged or contacted for it, and our own traffic counts as testing, never as usage.

## Question
When people speak numbers in Hindi, Telugu or Kannada, does UTR Pakka's number layer (web/lib/entities/numbers.ts: spokenToDigits on the speech-to-text transcript) recover the exact digits more often than the speech-to-text transcript's own numerals do?

## Metric and threshold
- Metric: exact-number rate per utterance. Reference = the sequence of digits in FLEURS `raw_transcription` (ASCII and native-script numerals, in order, separators dropped). Baseline answer = the numerals that appear in the Sarvam transcript (ASCII and native-script, in order). Our answer = spokenToDigits(the same Sarvam transcript). An utterance scores 1 when the answer equals the reference exactly, else 0. Both answers use the same transcript of the same audio, so the comparison is paired.
- Threshold: the paired difference (ours minus baseline) is above 0 with the low end of its 95% interval above 0, pooled over the three languages; per-language rates are reported next to it, failures included.
- Interval: 95%, from `python3 evidence/interval.py` (Wilson for k of n, bootstrap for a mean or a difference)

## Data
- Dataset: FLEURS (google/fleurs), https://huggingface.co/datasets/google/fleurs, CC-BY-4.0. Languages hi_in, te_in, kn_in. Only utterances whose raw_transcription contains at least one numeral.
- Version or hash: Hugging Face revision 70bb2e84b976b7e960aa89f1c648e09c59f894dd (pinned in every download URL).
- Split: FLEURS's own split. Building slice: dev.tsv (hi 21, te 45, kn 56 utterances with numerals). Test slice: test.tsv, never opened or transcribed while building; run once after the build freezes.

## Baseline
- Whose: Sarvam's own speech-to-text output, model saarika:v2.5 (https://docs.sarvam.ai), as returned by its public API: the vendor's number formatting in its transcript. Sarvam publishes no score on this split.

## Success rule
On the FLEURS test slice (hi+te+kn pooled), `python3 evidence/interval.py diff results.csv ours baseline` gives a 95% interval whose low end is above 0. If not, the claim is not made, and the result is published as it is.

## Models and seeds
- Models: speech-to-text = Sarvam saarika:v2.5 (the sponsor stack's ASR, named because it is the baseline itself). No language model is used in the number layer.
- Seeds: bootstrap seed 7 (interval.py default), 10,000 draws.

## How results are reported
Every result names its kind at first mention, gives n, the source, the period and a 95% interval, and links its rerun command and commit. Measured numbers and estimates are kept apart, and failures are shown next to successes.

| Kind | Label at first mention | Travels with the number | Never used for this kind |
|---|---|---|---|
| Replay on public data | Back-test on public data (<dataset>, <years>) | n records, source and licence, period, whose baseline, 95% interval, rerun command and commit | `users`, `patients helped`, `customers`, `pilot`, `deployed with`, `proven`, `clinically validated` |
| Estimate from a replay | Estimate, not an observed result | the assumptions, and the data fields used to price it | `impact achieved`, `saved X hours for users`, `lives saved` |
| Real public system | Test transactions from wallets we control (addresses listed), or replayed in our own forks | counts, links, addresses | `users`, `volume`, `traction` |
| Break test | Our own break test (we tried to make it fail) | what we tried, how many attempts, what broke and what we fixed | `users`, `testers`, `validated` |

The README and the submission text open their evidence section with one line before any number:

> Evidence, stated plainly: no real users yet; it was built for this hackathon. Instead: <a back-test on <dataset> against <published baseline>>, <test transactions from wallets we control>, <our own break test of <the main claim>>. Each one reruns from the repo with one command.

Then one card per claim:

> Claim: <product> <does k of n <cases>> at <budget>.
> Evidence type: <label from the table above>, not real users.
> Data: <dataset, link, licence>, <period>, <n rows>. Baseline: <source> scores <x> on the same split.
> Result: <y> (95% interval <a> to <b>).
> Rerun: `<command>` at commit <hash>. Limits: <historical data, no live behaviour; any specific skew>.

Then a short limits paragraph, in numbers: zero real users, the interval, the data's years, and the next real test, with the metric and threshold that would change the conclusion.

## Changes after the first run
None yet.

## Second claim: our own break test (not real users, not public data)
12-digit UTRs, 10-digit mobiles and amounts spoken digit by digit and in pairs by Murf Falcon voices in hi, te, kn and en, with white noise mixed in at 20, 10 and 5 dB SNR, 25 numbers per language per noise level (seeded, seed 7). Same metric and baseline as above. Labelled "Our own break test" everywhere; it measures robustness on synthetic audio and says so.
