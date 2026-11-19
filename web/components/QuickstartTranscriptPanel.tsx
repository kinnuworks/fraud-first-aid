'use client';

import { useEffect, useMemo, useRef } from 'react';

type TranscriptMessage = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  createdAt?: number;
};

type QuickstartTranscriptPanelProps = {
  messageList: TranscriptMessage[];
  currentInProgressMessage: TranscriptMessage | null;
  agentUID: string;
};

function formatMessageTime(createdAt?: number) {
  if (!createdAt) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

export function QuickstartTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
}: QuickstartTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(
    () =>
      currentInProgressMessage
        ? [...messageList, currentInProgressMessage]
        : messageList,
    [currentInProgressMessage, messageList],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <section className="up-transcript" aria-label="Transcription panel">
      <div className="flex shrink-0 items-baseline justify-between gap-3 px-6 pb-3 pt-5">
        <h2 className="up-label">Transcript</h2>
        <p className="text-[0.8125rem]" style={{ color: 'var(--ink-3)' }}>
          Live voice turns
        </p>
      </div>
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
            Start speaking to see the live transcript here.
          </div>
        ) : (
          messages.map((message, index) => {
            const isAgent = String(message.uid) === agentUID;
            const text = message.text?.trim();
            const time = formatMessageTime(message.createdAt);
            return (
              <article key={`${message.turn_id ?? message.uid}-${index}`} className="tr-row" data-agent={isAgent ? '' : undefined}>
                <span className="tr-time">{time ?? ''}</span>
                <span>
                  <span className="tr-who">{isAgent ? 'UTR Pakka' : 'You'}</span>
                  <span className="tr-text up-bubble">{text || '...'}</span>
                </span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
