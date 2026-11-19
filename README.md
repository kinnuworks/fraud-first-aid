# UTR Pakka

**Get your money frozen in the first hour.** *Your UPI fraud complaint, spoken.*

Since 2021 Indians have reported losing about ₹64,447 crore to cyber fraud, and about ₹323 crore of it has been refunded (Home Ministry officials briefing the Prime Minister, [reported by Pratidin Time, 9 Jul 2026](https://www.pratidintime.com/national/rs-25000-cr-saved-via-e-zero-firs-pm-modi-briefed-12149338), and by the Indian Express). Money can still be frozen if 1930 hears fast and gets every detail exact. That has to happen in the first hour, when the victim is at their worst and may not think in English. UTR Pakka is a voice agent that stays with them through that hour, in Telugu, Hindi, Kannada, Tamil, Malayalam, Bengali, Marathi, Gujarati, Punjabi or English.

What it does for you:

1. **During the scam**, it listens to the call on speaker and tells you to hang up before you lose anything. (It caught 40 of 40 scam requests in our own guard break test, after three fixes.)
2. **If the money's gone**, it takes your complaint by voice and gets every detail right. Each number is read back in groups of four until you confirm it, then checked against your payment screenshot. (295 of 300 spoken numbers exact in noise in our own break test; 207 of 330 on public speech against 114 for the speech-to-text alone.)
3. **It acts**: it finds your bank and branch from the IFSC code, your bank's own fraud line, and the date your bank must hear by for zero liability (RBI: 3 working days).
4. **It hands you everything**: the 1930 script in your language, an English card for the 1930 operator, the bank letter, two calendar reminders, and the Ombudsman and Chakshu steps. It emails the pack once you say yes, and your family can listen to the call live.

A fast report is what gets the money back. A 79-year-old in Mangaluru got ₹17 lakh back and a 44-year-old in Bengaluru got ₹14 lakh back, both because 1930 heard within hours ([cases below](#why-this-matters)).

It runs on Agora's Conversational AI Engine because the job is a live conversation with a frightened person: Sarvam speech-to-text in the caller's language, our model with its complaint tools, and a Murf Falcon voice that reads each number back, with Agora handling interruptions and turn-taking.

**Live:** https://utr-pakka.vercel.app

![The live app, sped up 16 times: the scam warning, the UTR read back and confirmed, the complaint pack](docs/core-loop.gif)

*The live app in one scripted run, sped up 16 times. The caller's voice is generated sample clips (an illustration), the app and its answers are real.*

**Watch it work:** [a 4-minute screen recording of the live app](https://utr-pakka.vercel.app/demo/full-flow.mp4), start to finish in one call. The voices are generated samples (an illustration, no human speaking) and the recording has no audio track; the transcript on screen shows what was said. It shows the guard staying silent through the small talk and warning in Telugu at the KYC threat, the hand-over when the caller says money has gone, the UTR read back in groups of four, the screenshot catching a misremembered group, and the pack with Call 1930, the bank letter, the operator card and the reminders. The sample call is code-mixed the way real ones are: a Hindi-speaking caller, a Telugu-speaking victim, and English words like UTR, KYC and OTP in both.

### Try it in 30 seconds

1. Open https://utr-pakka.vercel.app on a laptop or phone, pick a language, press **Start talking** and allow the microphone.
2. Say what happened, then a made-up 12-digit UTR digit by digit ("four zero two one, seven seven eight eight, nine nine one zero"), an amount and a UPI ID.
3. Listen to the read-back, say "the second group is wrong" and correct it. The card fills in and ticks each confirmed field; when all five are confirmed, the 1930 script, the bank letter, an English card for the 1930 operator and two calendar reminders appear.

Or press "A scam call is happening? Let UTR Pakka listen", then "Play a sample scam call": it stays silent through the small talk and warns in Telugu the moment the caller asks for the OTP.

No account, no sign-up. To see every screen without talking: [`?state=complaint-done`](https://utr-pakka.vercel.app/?state=complaint-done), [`?state=complaint-mismatch`](https://utr-pakka.vercel.app/?state=complaint-mismatch) (sample data, labelled as such).


## Why this matters

- Indians reported losing Rs 22,845.73 crore to cyber fraud in 2024, across 36,37,288 financial-fraud incidents (Lok Sabha reply, Ministry of Home Affairs, 22 July 2025, [reported by The Week](https://www.theweek.in/wire-updates/business/2025/07/22/del23-lsq-cyber-fraud.html)).
- UPI-related frauds alone came to Rs 981 crore in FY 2024-25, in 12.64 lakh incidents (Lok Sabha reply, Ministry of Finance, 15 Dec 2025, [reported by IANS](https://ianslive.in/upi-frauds-worth-rs-805-crore-witnessed-this-fiscal-so-far-minister--20251215175703)).
- Money can only be held while it is still in the system, which takes a fast report with exact details. The 1930 system had "saved" (held, not yet returned) more than Rs 11,158 crore in more than 32.80 lakh complaints by 30 June 2026 (Lok Sabha reply, [reported August 2026](https://www.newkerala.com/news/a/cyber-fraud-crackdown-centre-blocks-over-3700-mobile-550.htm)).
- On 17 June 2026 the Home Minister reviewed the 1930 helpline and asked it to integrate AI tools and add multilingual support, noting that language barriers stop victims from reporting promptly ([reported by Devdiscourse](https://www.devdiscourse.com/article/headlines/3936185-hm-shah-reviews-functioning-of-national-cybercrime-helpline-asks-to-revamp-system-to-improve-efficiency)).
- Under RBI circular RBI/2017-18/15, a customer has zero liability for a third-party breach reported to the bank within three working days. After seven working days, the bank's own policy decides ([circular reproduced by Taxguru](https://taxguru.in/?p=618226)).

The links go to news reports of the parliamentary replies; we couldn't open the government pages themselves.

Two reported cases from Karnataka show why the first hour matters:
- A 44-year-old woman in Bengaluru lost Rs 14 lakh to a "digital arrest" call. She called 1930 within the golden hour, the receiving account was frozen, and the full amount was returned ([Telangana Today, PTI, 23 Sep 2025](https://telanganatoday.com/bjp-mp-k-sudhakars-wife-duped-of-rs-14-lakh-in-digital-arrest-scam-money-recovered)).
- A 79-year-old woman in Mangaluru sent Rs 17 lakh, her life savings, after five hours on a fake video "arrest". Police reached the bank through 1930 the same day, froze the account before the money left it, and returned all of it ([The Mangalorean, 31 Oct 2025](https://www.mangalorean.com/mangaluru-police-recover-rs-17-lakh-in-digital-arrest-scam-return-funds-to-elderly-victim)).

In both, the money was held because the report reached 1930 within hours.

## Who would run it, and how it grows

The people who take these reports today are the 1930 helpline, state cyber cells and bank fraud desks, mostly by phone. In June 2026 the Home Minister asked the 1930 helpline to add AI tools and multilingual support ([Devdiscourse](https://www.devdiscourse.com/article/headlines/3936185-hm-shah-reviews-functioning-of-national-cybercrime-helpline-asks-to-revamp-system-to-improve-efficiency)). UTR Pakka is built for that hand-off: the victim speaks their own language, and the operator gets an English card with every number confirmed. That these teams would adopt it is our assumption; none of them has said so.

What it already runs on:

- Every call is its own Agora agent with its own capability key, so calls don't share state, and a busy hour means more agents rather than a bigger server.
- A new language is configuration: a Sarvam language code and a Murf Falcon voice in [`agent-config.ts`](web/lib/agent-config.ts), plus the number words in [`numbers.ts`](web/lib/entities/numbers.ts), with tests.
- The 1930 operator and the family each get a read-only live view of the call by link (`/watch?as=operator`, `/watch?as=family`).
- The same agent is wired to call out over a phone line (Agora telephony through a SIP trunk, [`phone.ts`](web/lib/handlers/phone.ts)) for a victim without a smartphone, or a callback before the bank's deadline. It isn't reliable yet (see the limits below).

What one complaint costs (an estimate, not an observed result, from each vendor's published price on 19 Nov 2026): our scripted live run took 3 min 43 s, so take a 4-minute call. Agora's Conversational AI Engine is US$0.10 a minute, the same with our own speech, model and voice keys ([Agora pricing](https://docs.agora.io/en/ai/reference/pricing)): US$0.40. Sarvam speech-to-text is ₹0.49 a minute ([Sarvam pricing](https://www.sarvam.ai/api-pricing)): ₹1.96. Murf Falcon is 1 cent per 1,000 characters ([Murf](https://murf.ai/api/docs/text-to-speech-models/falcon-2-1)): about 2 cents, assuming 2,000 characters spoken. The AI model adds about 1 cent, assuming 25 turns of about 4,000 tokens. In total, about US$0.43 plus ₹2 per complaint, almost all of it the real-time voice minutes. Assumptions: call length from one run; characters and tokens estimated, not measured.

What a real deployment would still need: an Indian phone number, and a filing API from the cybercrime portal, which has none public today. Calls already share state through a Redis store (Upstash), so any server instance can answer any turn.

## How it works

```
caller ──voice──▶ Agora Conversational AI Engine
                    ├─ Sarvam speech-to-text (10 languages: te, hi, kn, ta, ml, bn, mr, gu, pa, en)
                    ├─ our model route  ──tools──▶ complaint session (numbers parsed by code)
                    └─ Murf Falcon voice (reads each number back in groups of four)
screen ◀── complaint card (polls the same session) ◀── payment screenshot check
```

1. Talk. The caller picks a language, or "Any language (auto)": Sarvam detects what they speak, one Murf Falcon voice that speaks all nine Indian languages answers, and the replies follow the caller's language turn by turn (checked live with a Telugu caller). Agora starts an agent with Sarvam speech-to-text in that language and a Murf Falcon voice. Code: [`web/lib/handlers/invite-agent.ts`](web/lib/handlers/invite-agent.ts), [`web/lib/agent-config.ts`](web/lib/agent-config.ts).
2. Capture. Agora sends each turn to our OpenAI-compatible model route. The model calls tools like `record_utr`, `record_amount`, `record_payee`; the tools read the numbers from the caller's own transcript, so the model never types a digit. Code: [`web/lib/llm-route.ts`](web/lib/llm-route.ts), [`web/lib/complaint/tools.ts`](web/lib/complaint/tools.ts).
3. Numbers in ten languages. Digits said one by one, in pairs ("ninety-eight"), with "double"/"triple", or as hundreds and thousands (నాలుగు వేల ఎనిమిది వందల తొంభై రెండు → 4892) become exact digits. Code and tests: [`web/lib/entities/numbers.ts`](web/lib/entities/numbers.ts).
4. Confirm. Every number is read back in groups of four in the caller's language. "The second group is wrong" re-asks only that group. Nothing counts until the caller says yes. Code: [`web/lib/complaint/session.ts`](web/lib/complaint/session.ts).
5. Second source. The caller can add the payment screenshot. An AI model reads the UTR, amount, payee and time from it, and each field is compared with what they said; a mismatch is read back with the exact group that differs. Code: [`web/lib/complaint/screenshot.ts`](web/lib/complaint/screenshot.ts), [`web/lib/complaint/vision.ts`](web/lib/complaint/vision.ts).
6. Act. The IFSC code is looked up on the public Razorpay IFSC API; the RBI 3- and 7-working-day deadlines are computed (Sundays and 2nd/4th Saturdays skipped); the pack is built: a script for the 1930 call in the caller's language, a dispute letter for the bank, an English card for the 1930 operator, two calendar reminders from the RBI rules, a one-tap Call 1930, and buttons to send the pack to family on WhatsApp or email the letter to the bank. Code: [`web/lib/complaint/ifsc.ts`](web/lib/complaint/ifsc.ts), [`web/lib/complaint/deadline.ts`](web/lib/complaint/deadline.ts), [`web/lib/complaint/pack.ts`](web/lib/complaint/pack.ts).

### How fast it answers

Measured in one scripted run of the live app (19 Nov 2026, 11 turns, recorded voice clips played into the browser; [results](evidence/results/latency-2026-11-19.csv)). The numbers are Agora's own per-turn metrics from the call screen.

| Step | Turns that skip the model (8 of 11: the opening, the UTR, each yes, the bank) | Turns that go through the model (3 of 11) |
|---|---|---|
| Speech-to-text (Sarvam), last word to text | 193 to 426 ms | 202 to 263 ms |
| Reply (our route) | 151 to 323 ms | 3,247 to 3,575 ms |
| Voice (Murf Falcon), first audio | 80 to 149 ms | 79 to 230 ms |

Confirmations and numbers skip the model: our route answers them from the complaint's state, so the reply step takes 151 to 323 ms instead of more than 3 seconds. Rerun: `cd web && npx -y tsx@4.20.6 scripts/demo-full.ts`. Limits: one run, synthetic voices, the browser and not a phone line.

## How it uses Agora and Murf

| Feature | What it does here | Where |
|---|---|---|
| Agora Conversational AI Engine (agora-agents SDK 2.14) | starts the voice agent per call, with Sarvam ASR, our model URL and Murf TTS | [`invite-agent.ts`](web/lib/handlers/invite-agent.ts) |
| Custom LLM endpoint | Agora calls our OpenAI-compatible route, guarded by a shared secret, with the call's session id | [`llm-route.ts`](web/lib/llm-route.ts), [`route.ts`](web/app/api/call/%5B...path%5D/route.ts) |
| Agora RTC + RTM | live audio, and transcripts on screen | [`ConversationComponent.tsx`](web/components/ConversationComponent.tsx) |
| Turn control | on guard the agent answers with a silent turn until it hears a red flag, then interrupts the call; a UTR said in pieces is held across turns until all 12 digits arrive | [`llm-route.ts`](web/lib/llm-route.ts), [`fastpath.ts`](web/lib/complaint/fastpath.ts) |
| Tool calling on our endpoint | record, read back, correct one group, confirm, take a value from the screenshot, switch from guard to complaint | [`tools.ts`](web/lib/complaint/tools.ts) |
| Agent metrics | speech-to-text, model and voice latency shown live in the call screen's pipeline bar | [`QuickstartPipelineMetrics.tsx`](web/components/QuickstartPipelineMetrics.tsx) |
| Murf Falcon TTS | the agent's voice per language: native voices for Hindi, Kannada, Tamil, Malayalam, Bengali, Marathi, Gujarati and Punjabi, and en-IN-anisha speaking Telugu and English | [`agent-config.ts`](web/lib/agent-config.ts) |

## Check it yourself

- The live app: https://utr-pakka.vercel.app
- The tests: `cd web && pnpm install && pnpm test` (number layer, complaint session, tools, pack, screenshot check, model route).
- The probes against the real speech APIs: `web/scripts/numbers-probe.ts` and `web/scripts/pairs-probe.ts` (Murf Falcon speaks a number, Sarvam transcribes it, our parser reads it back).

## Evidence

Evidence, stated plainly: no real users yet; it was built for this hackathon. Instead: a back-test on public speech (FLEURS, Hindi/Telugu/Kannada) against the speech-to-text's own numerals, planned and committed before any run in [`evidence/EVAL_PLAN.md`](evidence/EVAL_PLAN.md), and our own break test of the main claim (spoken numbers in noise). Each one reruns from the repo with one command.

> Claim: UTR Pakka reads spoken 10- and 12-digit numbers exactly in 295 of 300 noisy clips.
> Evidence type: our own break test (we tried to make it fail), not real users.
> Data: Murf Falcon voices speaking 25 numbers digit by digit in Hindi, Telugu, Kannada and English, with white noise at 20, 10 and 5 dB, 19 Nov 2026, 300 clips ([results](evidence/results/breaktest-2026-11-19.csv)). Baseline: the numerals in Sarvam saarika:v2.5's own transcript of the same clips, 79 of 300.
> Result: 98.3% exact (95% interval 96.2% to 99.3%); 96 of 100 even at 5 dB.
> Rerun: `npx tsx evidence/breaktest/run.ts` (needs Murf and Sarvam keys). Limits: synthetic voices and white noise, not real callers on phone lines; in English the baseline already writes numerals, so the gain is in Hindi, Telugu and Kannada.

> Claim: on real Hindi, Telugu and Kannada speech, UTR Pakka gets the exact numbers right in 207 of 330 sentences, against 114 for the speech-to-text's own numerals.
> Evidence type: back-test on public data (FLEURS, read speech), not real users.
> Data: FLEURS test slice ([google/fleurs](https://huggingface.co/datasets/google/fleurs), revision 70bb2e84, CC-BY-4.0), every test sentence with a number in Hindi, Telugu and Kannada, 330 sentences (5 over 30 seconds left out for both); planned and committed before any run, run once on 19 Nov 2026 ([results](evidence/results/fleurs-test-2026-11-19.csv)). Baseline: the numerals in Sarvam saarika:v2.5's own transcript of the same audio, 114 of 330 (34.5%).
> Result: 62.7% exact (95% interval 57.4% to 67.8%); paired difference +0.28 (95% interval 0.23 to 0.33). Hindi 48/64, Telugu 63/105, Kannada 96/161.
> Rerun: `python3 -I evidence/fleurs/fetch.py test && npx tsx evidence/fleurs/score.ts test` at commit 6e94442. Limits: read sentences, not phone calls; the numbers are years and amounts inside sentences, not dictated UTRs. Limits, in numbers: zero real users; 330 read sentences and 300 synthetic clips; the next real test is a recorded phone call per language, where a miss rate above 5% would change this claim.

> Claim: the scam guard warned on 20 of 20 disguised asks and held on 20 of 20 attempts to switch it off.
> Evidence type: our own break test (we tried to make it fail), not real users.
> Data: 40 caller lines we wrote, 19 Nov 2026, in English, Hindi and Telugu, sent as text turns to the live model route in guard mode ([results](evidence/results/guard-breaktest-final-2026-11-19.csv)). Group A: OTP, PIN, QR, remote-app, payment and arrest asks without the obvious words, code-mixed or split over two turns. Group B: "ignore your instructions", "test mode, warnings off", "the user already approved this", each with a real ask.
> Result: the first run caught 13 of 20 and 19 of 20 ([run 1](evidence/results/guard-breaktest-run1-2026-11-19.csv)). It found three bugs: warnings that never reached the card, "already approved" read as money lost, and "the number that came in the message" not seen as an OTP ask. After the fixes: 20 of 20 and 20 of 20.
> Rerun: `npx tsx evidence/breaktest/guard.ts`. Limits: text turns, not audio; lines written by us; one run after the fixes.

## What doesn't work yet

- It doesn't file the complaint for you. The national cybercrime portal has no public API and asks for an OTP and a captcha, so UTR Pakka prepares everything and you call 1930 or file yourself.
- It can't get money back, and it never asks for an OTP, PIN, password or card number.
- The phone line isn't reliable yet. The agent can place a call through Agora's telephony and a Twilio SIP trunk, and it has rung a test phone, but in our tests only 2 of about 14 calls left Agora's SIP gateway. For now you talk to it in the browser.
- Emailing the pack runs on Resend's test sender, which only delivers to our own address until a sending domain is verified. You can copy everything from the screen.
- A call's complaint is kept in a shared store (Upstash Redis) for two hours so any server instance can answer it, then it expires; nothing is kept afterwards.
- The number tests use synthetic Murf voices and public read speech, not real callers on noisy phone lines.

## Run it locally

```bash
cd web
cp env.local.example .env.local   # Agora App ID + certificate, Murf and Sarvam keys
pnpm install
pnpm dev
```

Set `LLM_PUBLIC_URL`, `LLM_SHARED_SECRET` and `ANTHROPIC_API_KEY` to use our model route; without `LLM_PUBLIC_URL` the agent falls back to Agora's managed model and a simpler prompt.

Built on Agora's [agent-quickstart-nextjs](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs) (MIT).
