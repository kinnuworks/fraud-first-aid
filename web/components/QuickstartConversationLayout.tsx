'use client';

import type { ReactNode } from 'react';
import { Logo } from './design/Logo';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  transcript?: ReactNode;
  side?: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
};

// The live call (Fold app system): a white top bar, a navy panel with the call and the bank deadline,
// the complaint in the middle (biggest), the transcript on the right (smallest).
export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  transcript,
  side,
  visualizer,
  controls,
  onEndConversation,
}: QuickstartConversationLayoutProps) {
  return (
    <div className="cs flex min-h-0 flex-1 flex-col overflow-y-auto text-left">
      <header className="cs-top">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="cs-tabs" aria-label="Sections">
            <a href="#live" aria-current="true">Live call</a>
            <a href="#complaint">Complaint</a>
            <a href="#pack">Pack</a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {statusPanel}
          <button
            type="button"
            className="up-btn up-btn--sm up-btn--ghost"
            style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
            onClick={onEndConversation}
            aria-label="End conversation with AI agent"
            title="End conversation"
          >
            End conversation
          </button>
        </div>
      </header>
      <div className="cs-grid">
        <div className="cs-left">
          <aside className="cs-side" aria-label="Call" id="live">
            <section>
              <span className="up-label">Live call</span>
              <div className="cs-orb">{visualizer}</div>
              <div className="cs-controls">{controls}</div>
              <div className="cs-pipe">{pipelineMetrics}</div>
            </section>
            {side && <section className="flex flex-col gap-3">{side}</section>}
            <div id="cs-deadline-slot" />
          </aside>
        </div>
        <main className="cs-main">{transcriptPanel}</main>
        <div className="cs-right">{transcript}</div>
      </div>
    </div>
  );
}
