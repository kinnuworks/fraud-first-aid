'use client';

// "Behind the scenes" on the landing page: the system as four readable lanes, and "Play one call",
// which steps through one call and lights up the parts that act at each step. Every label matches
// the code (web/lib/complaint/tools.ts, web/lib/handlers/*, web/lib/agent-builder.ts); the same
// picture as an image is docs/architecture.png.
import { useEffect, useRef, useState } from 'react';

type Item = { id: string; title: string; line: string; off?: boolean };
type Lane = { id: 'you' | 'ag' | 'sv' | 'ex'; name: string; sub: string; items: Item[] };

const LANES: Lane[] = [
  {
    id: 'you',
    name: 'You',
    sub: 'a phone or laptop browser',
    items: [
      { id: 'you-call', title: 'The call, on speaker', line: 'a scam call, or your 1930 call' },
      { id: 'you-page', title: 'The live page', line: '10 languages, "Speak slowly", "Type instead"' },
      { id: 'you-see', title: 'What you see', line: 'the warning, the live steps, your complaint card' },
      { id: 'you-pack', title: 'Your 1930 pack', line: 'script, English card, bank letter, reminders' },
      { id: 'you-second', title: 'Second screens', line: 'the 1930 operator view, and family on the call' },
    ],
  },
  {
    id: 'ag',
    name: 'Agora',
    sub: 'live voice and the AI agent',
    items: [
      { id: 'ag-agent', title: 'One AI agent per call', line: 'Sarvam hears, our server decides, Murf Falcon speaks' },
      { id: 'ag-turn', title: 'Turn-taking', line: 'silent while it listens; waits for you to finish' },
      { id: 'ag-speak', title: 'Speak API', line: 'makes it interrupt itself, or confirm out loud' },
      { id: 'ag-second', title: 'Second agent, same call', line: 'the 1930 interpreter: English to the operator' },
      { id: 'ag-rtc', title: 'RTC and RTM', line: 'live audio, transcript, timings, family, typing' },
      { id: 'ag-tel', title: 'Telephony', line: 'built, switched off: waiting on Agora', off: true },
    ],
  },
  {
    id: 'sv',
    name: 'Our server',
    sub: 'the brain',
    items: [
      { id: 'sv-guard', title: 'The guard', line: 'spots the scam ask; names it from RBI, PIB, SEBI, TRAI' },
      { id: 'sv-fast', title: 'Fast path', line: 'code answers yeses and digits in 0.15 to 0.34 s' },
      { id: 'sv-numbers', title: 'Number layer', line: 'speech to exact digits; the AI never types one' },
      { id: 'sv-model', title: 'AI model + 12 tools', line: 'takes the complaint step by step' },
      { id: 'sv-shot', title: 'Screenshot check', line: 'catches a wrong group of digits' },
      { id: 'sv-banks', title: 'Deadlines and banks', line: 'RBI working days; 9 banks’ fraud lines' },
      { id: 'sv-pack', title: 'Pack builder', line: '1930 script, bank letter, day-30 Ombudsman' },
    ],
  },
  {
    id: 'ex',
    name: 'Services',
    sub: 'APIs it calls',
    items: [
      { id: 'ex-sarvam', title: 'Sarvam', line: 'speech-to-text, 10 languages' },
      { id: 'ex-murf', title: 'Murf Falcon', line: 'a recommended voice per language' },
      { id: 'ex-ai', title: 'AI model API', line: 'the conversation, and reading screenshots' },
      { id: 'ex-ifsc', title: 'Razorpay IFSC', line: 'your bank and branch' },
      { id: 'ex-resend', title: 'Resend', line: 'emails the pack after a yes' },
      { id: 'ex-store', title: 'Upstash', line: 'the call’s state, for 2 hours' },
    ],
  },
];

// The organisers' five stages (FAQ 44), which the judges score against.
const STAGES: Array<{ name: string; line: string }> = [
  { name: 'Initiate', line: 'you speak to the agent: Agora Conversational AI, with a Murf Falcon voice' },
  { name: 'Understand and plan', line: 'it works out what you need and what to do next' },
  { name: 'Execute', line: 'it calls tools and APIs to do the task' },
  { name: 'Confirm', line: 'it shares the result, handles errors, and asks before critical actions' },
  { name: 'Follow up', line: 'it updates records, sends the summary, and schedules the next steps' },
];

const STEPS: Array<{ say: string; on: string[]; stage: number }> = [
  { say: 'The scam call plays on speaker. An Agora agent listens, and says nothing.', on: ['you-call', 'ag-agent', 'ag-turn', 'ag-rtc', 'ex-sarvam', 'sv-guard'], stage: 0 },
  { say: 'The caller asks for your OTP. The guard spots it, and the agent warns you in your language.', on: ['sv-guard', 'ag-agent', 'ex-murf', 'you-see'], stage: 1 },
  { say: '"I already paid." The same call starts taking your complaint by voice.', on: ['you-page', 'ag-agent', 'sv-model', 'ex-ai', 'ex-store'], stage: 1 },
  { say: 'You say the 12-digit UTR. Code turns it into exact digits and reads it back in groups of four.', on: ['sv-numbers', 'sv-fast', 'ag-agent', 'ex-murf', 'you-see'], stage: 2 },
  { say: 'Your payment screenshot disagrees. The agent interrupts itself and names the wrong group.', on: ['you-page', 'sv-shot', 'ex-ai', 'ag-speak'], stage: 3 },
  { say: 'It finds your bank, its own fraud line, and your RBI zero-liability deadline.', on: ['sv-banks', 'ex-ifsc', 'sv-model'], stage: 2 },
  { say: 'It builds your 1930 pack with three reminders, and emails it only after you say yes.', on: ['sv-pack', 'ex-resend', 'ag-speak', 'you-pack'], stage: 3 },
  { say: 'On your 1930 call, a second agent talks to the operator in English, then saves the acknowledgement number.', on: ['ag-second', 'you-call', 'you-second', 'sv-model', 'ex-murf'], stage: 4 },
];

export function BehindTheScenes() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);

  // Start playing once, when the section is first on screen, unless the visitor prefers reduced motion.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          setStep(1);
          setPlaying(true);
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setStep((s) => (s >= STEPS.length ? 1 : s + 1)), 3800);
    return () => clearTimeout(t);
  }, [playing, step]);

  const active = step > 0 ? new Set(STEPS[step - 1].on) : null;
  const go = (n: number) => {
    setPlaying(false);
    setStep(n);
  };

  return (
    <section id="inside" ref={ref} className="bts up-wrap" aria-labelledby="bts-title">
      <h2 id="bts-title" className="up-label">
        Behind the scenes
      </h2>
      <p className="bts-lead">
        Your voice goes to an Agora AI agent made for your call. Sarvam hears it, our server decides what to do, and Murf Falcon answers in your
        language. Play one call to see which part does what.
      </p>

      <div className="bts-player">
        <button
          type="button"
          className="bts-play"
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              setStep((s) => (s === 0 || s >= STEPS.length ? 1 : s + 1));
              setPlaying(true);
            }
          }}
          aria-pressed={playing}
        >
          {playing ? 'Pause' : step === 0 ? 'Play one call' : 'Play'}
        </button>
        <ol className="bts-dots" aria-label="Steps of one call">
          {STEPS.map((s, i) => (
            <li key={s.say}>
              <button
                type="button"
                className="bts-dot"
                aria-current={step === i + 1 ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.say}`}
                onClick={() => go(i + 1)}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <p className="bts-say">
          {step > 0 ? (
            <>
              <b>
                Step {step} · {STAGES[STEPS[step - 1].stage].name}.
              </b>{' '}
              {STEPS[step - 1].say}
            </>
          ) : (
            'Press play, or pick a step.'
          )}
        </p>
      </div>

      <ol className="bts-stages" aria-label="The five stages of the agent's work">
        {STAGES.map((st, i) => {
          const first = STEPS.findIndex((x) => x.stage === i) + 1;
          const on = step > 0 && STEPS[step - 1].stage === i;
          return (
            <li key={st.name} className={`bts-stage${on ? ' is-on' : ''}`}>
              <button type="button" onClick={() => go(first)} aria-current={on ? 'true' : undefined}>
                <span className="bts-stage-n">{i + 1}</span>
                <b>{st.name}</b>
                <span className="bts-stage-line">{st.line}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={`bts-lanes${active ? ' is-playing' : ''}`}>
        {LANES.map((lane, li) => (
          <div key={lane.id} className={`bts-lane bts-lane--${lane.id}`}>
            <div className="bts-head">
              <span className="bts-name">{lane.name}</span>
              <span className="bts-sub">{lane.sub}</span>
              {li < LANES.length - 1 && (
                <span className="bts-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </div>
            <ul className="bts-items">
              {lane.items.map((it) => (
                <li key={it.id} className={`bts-item${active?.has(it.id) ? ' is-on' : ''}${it.off ? ' is-off' : ''}`}>
                  <b>{it.title}</b>
                  <span>{it.line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="bts-more">
        <a href="/architecture.png" target="_blank" rel="noopener noreferrer">
          Open the full diagram
        </a>{' '}
        (with the 12 tools, the proof and privacy) · Every part, with its code and tests: <a href="/proof">Check it yourself</a>
      </p>
    </section>
  );
}
