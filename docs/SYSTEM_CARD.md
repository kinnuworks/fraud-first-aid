# Fraud First Aid: system card

What the agent does, what it will not do, how it can fail, what it keeps, and how it was tested. Every number here is in the repository's results files, with the command that reruns it.

## What it does

- **On guard**, it listens to a call the user has put on speaker and stays silent until it hears a red flag: a request for an OTP, PIN, password or card number, a QR code to scan, a screen-sharing app, a payment, a threat of arrest, or a loan, prize, job or investment offer that then asks for a fee, documents, a link, an app or a move to WhatsApp. Then it tells the user, in their language, to hang up, and names the scam with the official advisory's own words.
- **If money has gone**, it takes the complaint by voice: the 12-digit UTR, the amount, the time, who was paid and the user's bank. Each number is read back in groups until the user confirms it, and checked against their payment screenshot if they add one.
- **It acts**: it looks up the bank and branch from the IFSC code, finds the bank's own fraud line, works out the RBI zero-liability deadline, and builds the pack (the 1930 script in the user's language, an English card for the operator, a bank letter, calendar reminders and a ready Ombudsman complaint). It emails the pack only after the user says yes.
- **On the 1930 call**, with the call on speaker, a second agent speaks to the operator in English and to the user in their language, reads the acknowledgement number back to the operator, and keeps it.

## What it will not do

- It never asks for an OTP, PIN, password, CVV or card number, and stops the user if they start to say one.
- It never types a digit itself. Numbers come from code that reads the user's own words (and the screenshot); the AI model only decides what to do next. On the 1930 call, the model marks the moment ([[intro]], [[utr]], [[ack:…]]) and code speaks the numbers.
- It does not file the complaint (the national portal has no public API and needs an OTP and a captcha), and it cannot recover money.
- It does not answer the scammer, and it keeps guarding after the user says money has gone, so a scammer can't talk it into silence by claiming a loss.

## How it can fail

- **Missing a scam.** On a fresh 200 public scam conversations it had never seen (ICFD-31k, synthetic text), the current guard warned on 144, and on 10 of 39 legitimate ones. The same AI model simply asked to warn about scams warned on 199, but also on 33 of 39 legitimate calls. We chose few false alarms over catching everything: a guard that cries wolf on every call is turned off. On scam conversations machine-translated into eight Indian languages (INDICA), it warned on 198 of 200 and on none of 200 legitimate ones (twelfth and tenth claims in [`evidence/EVAL_PLAN.md`](../evidence/EVAL_PLAN.md)).
- **A false alarm.** In our own break test it stayed silent on 24 of 24 ordinary calls (family, office and payment talk in English, Hindi and Telugu). A real deployment would see far more variety.
- **Mishearing a number.** Every number is read back and must be confirmed; a screenshot that disagrees makes the agent cut in at once. In noise, 295 of 300 spoken numbers came out exact (synthetic voices).
- **Languages.** Its spoken lines in eight of the ten languages were written by us and not yet checked by native speakers.
- **The 1930 interpreter** has been tested only with sample voices playing the operator, not on a real 1930 call. In three of four live runs on 20 and 21 Nov, speech recognition on the call got one or two digits of the 14-digit acknowledgement number wrong on first hearing, though the same clip sent straight to the speech-to-text service came back exact. That is why it reads the number back to the operator, who can correct it on the call, and why it puts a number read out over two turns back together. In the fourth run it heard the number exactly and the operator confirmed it. A correction on a live call hasn't happened in our tests yet.

## What it keeps

- A call's complaint lives in a shared store for two hours, then expires. Any OTP, PIN or CVV said on the call is blanked first, and the store keeps a fingerprint of what was heard, not the words.
- A keyed hash of a confirmed payee's UPI ID (never the ID) is counted for 90 days, so a later call that names the same ID can be warned; only complaints whose UTR matched the payment screenshot count.
- No recording of the call audio is kept.

## Security

A security review and a bug audit on 20 Nov found and fixed, among others: phone calls that anyone could start to any number (switched off), rate limits that empty requests could use up (now counted only for real calls, with cheap per-instance limits on free routes), "listen-only" links that could speak (never played), sign-in under the agent's own id (refused), one secret doing three jobs (call keys now have their own), the email provider's error text naming our account (replaced), and missing security headers (added). Keys stay on the server; every call has its own capability key.

## How it was tested

| What | Result | Kind |
|---|---|---|
| Public scam conversations it never saw (ICFD-31k) | 133 of 200 warned (keyword rules: 5), 20 Nov morning; 111 of 200 that evening under a stricter shared rule, against 197 for a general assistant that also warned on 33 of 39 legitimate calls | back-test on public data |
| Ordinary calls | 24 of 24 left alone | our own break test |
| Disguised asks and switch-off attempts | 40 of 40 warned | our own break test |
| Spoken numbers in noise | 295 of 300 exact (speech-to-text alone: 79) | our own break test |
| Real read speech, Hindi, Telugu, Kannada (FLEURS) | 207 of 330 exact (speech-to-text alone: 114); 211 of 330 through a phone codec | back-test on public data |
| Five calls at once on the live app | 5 of 5 warned | our own test |

Results files and rerun commands: [`evidence/results/`](../evidence/results/), and the "Check it yourself" page at https://fraudfirstaid.vercel.app/proof.
