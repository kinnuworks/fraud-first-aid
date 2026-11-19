'use client';
// Type instead of speaking: for a noisy room, a failing mic, or a caller who would rather type the
// UTR. The text goes to the same agent over Agora RTM (sendText), so the same route, tools and card
// handle it, and the agent answers aloud as usual.
import { useState } from 'react';
import { AgoraVoiceAI, ChatMessagePriority, ChatMessageType } from 'agora-agent-client-toolkit';

export function TypeInstead({ agentUid }: { agentUid: string }) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setState('sending');
    try {
      await AgoraVoiceAI.getInstance().sendText(agentUid, { messageType: ChatMessageType.TEXT, priority: ChatMessagePriority.INTERRUPTED, responseInterruptable: true, text: t });
      setText('');
      setState('sent');
    } catch (err) {
      console.error('[type-instead]', err);
      setState('error');
    }
  };
  return (
    <form onSubmit={send} className="flex flex-col gap-2 px-4 pb-4" data-testid="type-instead">
      <label htmlFor="type-instead-input" className="text-[0.8125rem] font-semibold" style={{ color: 'var(--ink-3)' }}>
        Noisy room? Type instead
      </label>
      <div className="flex gap-2">
        <input
          id="type-instead-input"
          className="up-input min-w-0 flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. my UTR is 4021 7788 9910"
          autoComplete="off"
        />
        <button type="submit" className="up-btn up-btn--sm" disabled={state === 'sending' || !text.trim()}>
          Send
        </button>
      </div>
      <span role="status" className="text-[0.8125rem]" style={{ color: 'var(--ink-3)' }}>
        {state === 'error' ? 'Could not send. Try again, or speak.' : state === 'sent' ? 'Sent. Fraud First Aid will answer aloud.' : ''}
      </span>
    </form>
  );
}
