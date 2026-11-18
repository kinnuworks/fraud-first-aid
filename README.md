# UTR Pakka

**Your UPI fraud complaint, spoken.**

UTR Pakka is a voice agent for someone who has just lost money in a UPI scam. They talk in any of ten languages (Telugu, Hindi, Kannada, Tamil, Malayalam, Bengali, Marathi, Gujarati, Punjabi or English); it gets every number right (the 12-digit UTR, the amount, who was paid) and hands them a complaint ready for the 1930 helpline and their bank.

It runs on Agora's Conversational AI Engine because the job is a live conversation with a frightened person. Agora runs the real-time loop: speech-to-text in the caller's language, our model with its complaint tools, and a Murf Falcon voice that reads each number back. It also handles interruptions and turn-taking.

**Live:** https://utr-pakka.vercel.app

### Try it in 30 seconds

1. Open https://utr-pakka.vercel.app on a laptop or phone, pick a language, press **Start talking** and allow the microphone.
2. Say what happened, then a made-up 12-digit UTR digit by digit ("four zero two one, seven seven eight eight, nine nine one zero"), an amount and a UPI ID.
3. Listen to the read-back, say "the second group is wrong" and correct it. The card on the right fills in and ticks each confirmed field; when all five are confirmed, the 1930 script, the bank letter and an English card for the 1930 operator appear.

No account, no sign-up. To see every screen without talking: [`?state=complaint-done`](https://utr-pakka.vercel.app/?state=complaint-done), [`?state=complaint-mismatch`](https://utr-pakka.vercel.app/?state=complaint-mismatch) (sample data, labelled as such).


## Why this matters

- Indians reported losing Rs 22,845.73 crore to cyber fraud in 2024, across 36,37,288 financial-fraud incidents (Lok Sabha reply, Ministry of Home Affairs, 22 July 2025, [reported by The Week](https://www.theweek.in/wire-updates/business/2025/07/22/del23-lsq-cyber-fraud.html)).
- UPI-related frauds alone came to Rs 981 crore in FY 2024-25, in 12.64 lakh incidents (Lok Sabha reply, Ministry of Finance, 15 Dec 2025, [reported by IANS](https://ianslive.in/upi-frauds-worth-rs-805-crore-witnessed-this-fiscal-so-far-minister--20251215175703)).
- Money can only be held while it is still in the system, which takes a fast report with exact details. The 1930 system had "saved" (held, not yet returned) more than Rs 11,158 crore in more than 32.80 lakh complaints by 30 June 2026 (Lok Sabha reply, [reported August 2026](https://www.newkerala.com/news/a/cyber-fraud-crackdown-centre-blocks-over-3700-mobile-550.htm)).
- On 17 June 2026 the Home Minister reviewed the 1930 helpline and asked it to integrate AI tools and add multilingual support, noting that language barriers stop victims from reporting promptly ([reported by Devdiscourse](https://www.devdiscourse.com/article/headlines/3936185-hm-shah-reviews-functioning-of-national-cybercrime-helpline-asks-to-revamp-system-to-improve-efficiency)).
- Under RBI circular RBI/2017-18/15, a customer has zero liability for a third-party breach reported to the bank within three working days. After seven working days, the bank's own policy decides ([circular reproduced by Taxguru](https://taxguru.in/?p=618226)).

The links go to news reports of the parliamentary replies; we couldn't open the government pages themselves.

## How it works

```
caller ──voice──▶ Agora Conversational AI Engine
                    ├─ Sarvam speech-to-text (10 languages: te, hi, kn, ta, ml, bn, mr, gu, pa, en)
                    ├─ our model route  ──tools──▶ complaint session (numbers parsed by code)
                    └─ Murf Falcon voice (reads each number back in groups of four)
screen ◀── complaint card (polls the same session) ◀── payment screenshot check
```

1. Talk. The caller picks a language; the page starts on Telugu. Agora starts an agent with Sarvam speech-to-text in that language and a Murf Falcon voice. Code: [`web/lib/handlers/invite-agent.ts`](web/lib/handlers/invite-agent.ts), [`web/lib/agent-config.ts`](web/lib/agent-config.ts).
2. Capture. Agora sends each turn to our OpenAI-compatible model route. The model calls tools like `record_utr`, `record_amount`, `record_payee`; the tools read the numbers from the caller's own transcript, so the model never types a digit. Code: [`web/lib/llm-route.ts`](web/lib/llm-route.ts), [`web/lib/complaint/tools.ts`](web/lib/complaint/tools.ts).
3. Numbers in ten languages. Digits said one by one, in pairs ("ninety-eight"), with "double"/"triple", or as hundreds and thousands (నాలుగు వేల ఎనిమిది వందల తొంభై రెండు → 4892) become exact digits. Code and tests: [`web/lib/entities/numbers.ts`](web/lib/entities/numbers.ts).
4. Confirm. Every number is read back in groups of four in the caller's language. "The second group is wrong" re-asks only that group. Nothing counts until the caller says yes. Code: [`web/lib/complaint/session.ts`](web/lib/complaint/session.ts).
5. Second source. The caller can add the payment screenshot. An AI model reads the UTR, amount, payee and time from it, and each field is compared with what they said; a mismatch is read back with the exact group that differs. Code: [`web/lib/complaint/screenshot.ts`](web/lib/complaint/screenshot.ts), [`web/lib/complaint/vision.ts`](web/lib/complaint/vision.ts).
6. Act. The IFSC code is looked up on the public Razorpay IFSC API; the RBI 3- and 7-working-day deadlines are computed (Sundays and 2nd/4th Saturdays skipped); the pack is built: a script for the 1930 call in the caller's language, a dispute letter for the bank, and an English card for the 1930 operator. Code: [`web/lib/complaint/ifsc.ts`](web/lib/complaint/ifsc.ts), [`web/lib/complaint/deadline.ts`](web/lib/complaint/deadline.ts), [`web/lib/complaint/pack.ts`](web/lib/complaint/pack.ts).

## How it uses Agora and Murf

| Feature | What it does here | Where |
|---|---|---|
| Agora Conversational AI Engine (agora-agents SDK 2.14) | starts the voice agent per call, with Sarvam ASR, our model URL and Murf TTS | [`invite-agent.ts`](web/lib/handlers/invite-agent.ts) |
| Custom LLM endpoint | Agora calls our OpenAI-compatible route, guarded by a shared secret, with the call's session id | [`llm-route.ts`](web/lib/llm-route.ts), [`route.ts`](web/app/api/call/%5B...path%5D/route.ts) |
| Agora RTC + RTM | live audio, and transcripts on screen | [`ConversationComponent.tsx`](web/components/ConversationComponent.tsx) |
| Murf Falcon TTS | the agent's voice per language: native voices for Hindi, Kannada, Tamil, Malayalam, Bengali, Marathi, Gujarati and Punjabi, and en-IN-anisha speaking Telugu and English | [`agent-config.ts`](web/lib/agent-config.ts) |

## Check it yourself

- The live app: https://utr-pakka.vercel.app
- The tests: `cd web && pnpm install && pnpm test` (number layer, complaint session, tools, pack, screenshot check, model route).
- The probes against the real speech APIs: `web/scripts/numbers-probe.ts` and `web/scripts/pairs-probe.ts` (Murf Falcon speaks a number, Sarvam transcribes it, our parser reads it back).

## Evidence

Evidence, stated plainly: no real users yet; it was built for this hackathon. Instead: our own break test of the main claim (spoken numbers in noise), and a back-test on public speech (FLEURS, Hindi/Telugu/Kannada) planned and committed before any run in [`evidence/EVAL_PLAN.md`](evidence/EVAL_PLAN.md). Each one reruns from the repo with one command.

> Claim: UTR Pakka reads spoken 10- and 12-digit numbers exactly in 295 of 300 noisy clips.
> Evidence type: our own break test (we tried to make it fail), not real users.
> Data: Murf Falcon voices speaking 25 numbers digit by digit in Hindi, Telugu, Kannada and English, with white noise at 20, 10 and 5 dB, 19 Nov 2026, 300 clips ([results](evidence/results/breaktest-2026-11-19.csv)). Baseline: the numerals in Sarvam saarika:v2.5's own transcript of the same clips, 79 of 300.
> Result: 98.3% exact (95% interval 96.2% to 99.3%); 96 of 100 even at 5 dB.
> Rerun: `npx tsx evidence/breaktest/run.ts` (needs Murf and Sarvam keys). Limits: synthetic voices and white noise, not real callers on phone lines; in English the baseline already writes numerals, so the gain is in Hindi, Telugu and Kannada.

The FLEURS test slice stays sealed until the build freezes; its result will appear here with its interval and rerun command. Limits, in numbers: zero real users; 300 synthetic clips; the next real test is a recorded phone call per language, where a miss rate above 5% would change this claim.

## What doesn't work yet

- It doesn't file the complaint for you. The national cybercrime portal has no public API and asks for an OTP and a captcha, so UTR Pakka prepares everything and you call 1930 or file yourself.
- It can't get money back, and it never asks for an OTP, PIN, password or card number.
- No phone number yet: you talk to it in the browser. A phone line and a callback before the bank's deadline are next.
- Emailing the pack to you isn't switched on yet; you copy it from the screen.
- A call's complaint lives in the server's memory for the length of the call; nothing is stored afterwards.
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
