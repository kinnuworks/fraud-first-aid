# A voice agent for the first hour after a UPI fraud: design and pre-registered evaluation

Technical report, 20 November 2026. Code, data pointers and rerun commands: this repository.

## Summary

When money leaves an account in a UPI fraud in India, it can still be frozen if the National Cybercrime Helpline (1930) and the bank hear about it fast, with every detail exact. That hour is when the victim is most frightened, and often they don't think in English. We built a voice agent on Agora's Conversational AI Engine, with Sarvam speech-to-text and Murf Falcon voices in ten Indian languages, that covers the whole hour. It listens to a scam call on speakerphone and warns in the victim's language. If the money has gone, it takes the complaint by voice, reads every number back for confirmation, checks it against the payment screenshot, and hands over what 1930 and the bank need. When the victim calls 1930, it can join that call on speaker and speak to the operator in English for them, with every number spoken by code, never by the AI model.

Every claim below was written into [`evidence/EVAL_PLAN.md`](../evidence/EVAL_PLAN.md) and committed before its run. Each claim reruns with one command, and its results file is in [`evidence/results/`](../evidence/results/). The main results:

- Back-test on public data (INDICA, conversations machine-translated into Indian languages), held-out test sample run once: the guard warned on 198 of 200 scam conversations (99.0%, 95% interval 96.4% to 99.7%) and on 0 of 200 legitimate ones (0.0% to 1.9%), in Telugu, Hindi, Kannada, Tamil, Malayalam, Bengali, Gujarati and English; keyword rules alone caught 16.
- Back-test on public data (ICFD-31k, synthetic scam calls in English and Hinglish, held-out fraud types), a fresh sample: the guard warned on 144 of 200 fraud conversations (72.0%, 65.4% to 77.8%) and 10 of 39 legitimate ones. The same AI model given a one-line prompt to warn about scams warned on 199 of 200, and on 33 of 39 legitimate ones: it warns on nearly everything. An earlier build warned on 133 of 200 of a different sample against 5 for keyword rules.
- Back-test on public data (FLEURS read speech in Hindi, Telugu and Kannada): exact numbers in 207 of 330 sentences (62.7%, 57.4% to 67.8%), against 114 for the speech-to-text's own numerals. Through a G.711 phone codec: 211 of 330 against 115.
- Our own break tests (we tried to make it fail): 295 of 300 spoken 10- and 12-digit numbers exact in white noise down to 5 dB; 40 of 40 scam requests caught, including attempts to switch the guard off; 24 of 24 ordinary calls left alone.

There are no real users. The system was built for a hackathon, and nothing here measures people using it.

## 1. The problem

Indians reported losing Rs 22,845.73 crore to cyber fraud in 2024, across 36,37,288 financial-fraud incidents (Lok Sabha reply, Ministry of Home Affairs, 22 July 2025). Home Ministry officials told the Prime Minister that of about Rs 64,447 crore reported lost from 2021 to May 2026, about Rs 10,718 crore was frozen and about Rs 323 crore refunded (reported by Pratidin Time, 9 July 2026, and the Indian Express). Money is held only while it is still in the system. Two reported cases from Karnataka show the mechanism: a 79-year-old in Mangaluru and a 44-year-old in Bengaluru each got all their money back (Rs 17 lakh and Rs 14 lakh) because 1930 heard within hours.

The details that decide it are numbers: a 12-digit UTR (transaction reference), the amount, the time, the payee's UPI ID. One wrong digit slows the freeze. On 17 June 2026 the Home Minister asked the 1930 helpline to add AI tools and multilingual support, because language barriers stop victims reporting promptly.

## 2. The system

One Agora Conversational AI agent per call. Agora runs the real-time loop: Sarvam speech-to-text in the caller's language, our OpenAI-compatible model route, and a Murf Falcon voice, with turn-taking and interruptions. Our route ([`web/lib/llm-route.ts`](../web/lib/llm-route.ts)) does three things a plain language model can't be trusted with:

1. Numbers come from the caller's transcript, never from model text. Tools read the caller's own words through a deterministic number layer ([`web/lib/entities/numbers.ts`](../web/lib/entities/numbers.ts)) that handles digits said one by one, in pairs, with "double" and "triple", as hundreds and thousands, and code-mixed, in ten languages.
2. Every number is read back in groups of four in the caller's language. "The second group is wrong" re-asks only that group, and nothing counts until the caller confirms it.
3. Common turns (a yes, a dictated UTR, a named bank, a clear red flag) skip the model and are answered from the complaint's state in 151 to 339 ms. Model turns take about 2.4 to 4.5 seconds (two scripted runs).

In guard mode the agent hears both sides of a speakerphone call as one stream. It answers with silence until a red flag: an OTP or PIN ask in any wording, a QR code "to receive money", a remote-access app, a payment demand or an arrest threat. Then it names the scam from official advisories and tells the user, in their language, to hang up. The lines it heard become a timestamped record for 1930, with the red-flag lines marked. A family member can join the same Agora channel from a link: listen-only with one key, or able to speak with another.

Two more pieces were added on 20 November. When something happens on screen rather than in speech (the payment screenshot is read, the pack is emailed from a button), Agora's speak API says it aloud at once in the caller's language; a screenshot that disagrees interrupts the agent (priority INTERRUPT) and names the UTR group that differs. And once the complaint is confirmed, a 1930 interpreter can join the caller's 1930 call on speaker. Agora can't change a running agent's speech recognition (its update API takes the token and model fields only), so the call's agent is stopped and a second agent starts on the same channel, hearing any language. It answers the operator only from the confirmed complaint. The model decides who is speaking and when, and marks the moment ([[intro]], [[utr]], [[ack:…]]); code then speaks the introduction, the UTR and the amount, and reads the acknowledgement number back to the caller. A live run caught the model saying an older UTR, the wrong date and a garbled acknowledgement number when it wrote them itself, which is why it no longer does.

## 3. How we evaluated

Each claim's question, data, metric, baseline and success rule went into the evaluation plan and was committed before any run (for example the ICFD plan, commit 0a7e298, 19 November 18:37 IST). Changes after a run were appended with their reason; the original lines stay. Where there is a baseline, the claim is made only if the low end of the 95% bootstrap interval of the paired difference is above zero ([`evidence/interval.py`](../evidence/interval.py)). Break tests have no baseline and say so.

The baseline for numbers is the numerals Sarvam's own transcript contains (saarika:v2.5). Our answer reads the same transcript of the same audio, so the comparison is paired. The guard has two baselines: our own keyword rules on the same turns, the obvious simpler detector, and the AI model the guard runs on, given only a one-line prompt to warn about scams (eleventh and twelfth claims), the obvious "just use an AI" alternative. Both systems get the same lines and the same rule for what counts as a warning.

For the guard in other languages we used INDICA, whole two-party conversations in ten Indian languages (eight of them ours), labelled scam or legitimate. Its file names point to a Chinese anti-fraud dataset, machine-translated and voiced; we use the text. We drew a check sample to find failures and a separate test sample, run once.

## 4. Results

| Claim | Kind | n | Result | Baseline | 95% interval of the difference |
|---|---|---|---|---|---|
| Guard in eight Indian languages, held-out test sample | back-test on public data (INDICA, machine-translated) | 200 scam + 200 legitimate | 198 scam warned (99.0%); 0 legitimate warned (0.0%, interval 0.0% to 1.9%) | keyword rules: 16 scam | +0.87 to +0.95 |
| Widened guard on fresh public scam conversations | back-test on public data (ICFD-31k) | 200 fraud + 39 no-violation | 144 fraud warned (72.0%); 10 of 39 legitimate warned | the same AI model, plain prompt: 199 fraud and 33 of 39 legitimate warned | -0.34 to -0.215 (it warns more, on everything) |
| Guard warns on held-out public scam conversations (19-20 Nov build) | back-test on public data (ICFD-31k) | 200 fraud conversations | 133 warned (66.5%); 81 at or before the dataset's own first fraud label | keyword rules: 5 | +0.57 to +0.71 |
| Exact numbers in real speech | back-test on public data (FLEURS hi/te/kn) | 330 sentences | 207 exact (62.7%) | Sarvam numerals: 114 | +0.23 to +0.33 |
| The same through a phone codec | back-test on public data (FLEURS, G.711) | 330 | 211 exact (63.9%) | 115 | +0.24 to +0.34 |
| Spoken numbers in noise | our own break test | 300 clips | 295 exact (98.3%) | 79 | +0.67 to +0.77 |
| Guard against disguised asks and switch-off attempts | our own break test | 40 lines | 40 of 40 | none | none |
| Guard on ordinary calls | our own break test | 24 calls | 24 of 24 silent | none | none |

Per language for the FLEURS back-test: Hindi 48 of 64, Telugu 63 of 105, Kannada 96 of 161 (full band); 48, 63 and 100 through the codec.

## 5. What the tests found, and what we fixed

The evaluations found real defects, and we fixed them before measuring again. We report them because they are the useful part.

- First ICFD run: invalid. Six conversations at a time against production split calls across server instances (the call's state was unavailable in 136 of 239). We added a shared store and reran one conversation at a time.
- Second ICFD run: stopped after 67 conversations, 3 warned. On the dataset's validation split we found two causes. The route passed the guard's own silent replies to the model as empty turns, and with that history the model stayed silent through a plain "pay Rs 7,500 to our Mobikwik ID". The loss rule also read "I've already said no" as money gone. After both fixes, validation went from 8 of 30 to 30 of 30 warned (89 of 90 on a larger slice). The third run on the held-out split is the result above.
- Guard break test, first run: 13 of 20 and 19 of 20. Three bugs: warnings that never reached the card, "the user already approved this" read as money lost, and "the number that came in the message" not seen as an OTP ask.
- Ordinary calls, first run: 20 of 24. "I already paid the electricity bill" switched an ordinary call to a complaint, and a family question got an answer. A payment alone no longer starts a complaint on guard.
- A full live run lost the payee and the time: the screen's poll reloaded the call over a turn still writing to it. Each running turn now holds its copy until it saves, and a save merges what another server instance added (the later phase, confirmed fields, flags and steps).
- The plain-assistant comparison (20 Nov evening) showed the guard warning on 111 of 200 ICFD fraud conversations under a shared rule, and the INDICA check sample showed what it missed: loan, investment and job offers that ask for documents, a fee, a link, an app or a move to WhatsApp, never for an OTP. We widened the guard from the check sample only, checked it still stayed silent on 24 of 24 ordinary calls and warned on 40 of 40 break-test lines, then measured once on fresh data: 144 of 200 on a new ICFD sample, and 198 of 200 with 0 of 200 false alarms on the INDICA test sample.
- A fresh bug audit and a security review on 20 Nov found, among others: a number in the caller's story held as UTR digits, "yesterday" counted as yes, "Rs. 5,000" on a screenshot read as 0.5, the time on a screenshot called a match, the guard switched off when the scammer claimed a loss, phone calls anyone could start to any number, rate limits empty requests could use up, listen-only links that could speak, and Agora's speak API failing on auth. Each has a test and a fix ([`web/lib/complaint/audit-fixes.test.ts`](../web/lib/complaint/audit-fixes.test.ts)).

## 6. Limits

- No real users and no real callers. The ICFD conversations are synthetic text written by a language model, not audio. The noise test uses synthetic Murf voices and white noise. FLEURS is read speech with numbers inside sentences, not dictated UTRs.
- The phone codec test simulates the codec only, with no packet loss or line noise.
- Ordinary-call and break-test lines were written by us, and the sets are small.
- It does not file the complaint (the cybercrime portal has no public API and asks for an OTP and a captcha) and cannot recover money.
- INDICA's conversations are machine-translated from a Chinese anti-fraud dataset: the scams are generic (loans, refunds, investments), not Indian UPI calls, and the guard was widened using the same dataset's check sample. The dataset states no licence, so only totals are reported.
- The plain-assistant baseline uses one prompt; a better-prompted assistant would do better, which is what the guard is.
- The 1930 interpreter has been tested only with sample voices playing the operator, not on a real 1930 call.
- The next real test is recorded phone calls from people reading made-up UTRs in each language. A miss rate above 5% there would change the number claim.

## 7. Reproduce

```bash
set -a; . web/.env.local; set +a          # Murf and a separate Sarvam test key
python3 -I evidence/fleurs/fetch.py test && npx tsx evidence/fleurs/score.ts test
python3 -I evidence/fleurs/phone.py test && npx tsx evidence/fleurs/score.ts test phone
npx tsx evidence/breaktest/run.ts          # numbers in noise
set -a; . web/.env; set +a                 # the model route's secret
npx tsx evidence/breaktest/guard.ts        # guard break test
npx tsx evidence/breaktest/ordinary.ts     # ordinary calls
npx tsx evidence/icfd/run.ts               # ICFD-31k cross-domain split
python3 -I evidence/interval.py diff <results.csv> ours baseline
```
