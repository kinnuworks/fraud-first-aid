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

// The live call: a top bar with the pipeline, a navy call panel (agent, mic, guard), the complaint
// dashboard in the middle (biggest), and the transcript inside a phone on the right (smallest).
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
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
          <Logo />
          {pipelineMetrics}
        </div>
        <div className="flex items-center gap-2">
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
        <aside className="cs-side" aria-label="Call">
          <span className="up-label">Live call</span>
          <div className="cs-orb">{visualizer}</div>
          <div>{controls}</div>
          {side}
        </aside>
        <main className="cs-main">{transcriptPanel}</main>
        <div className="cs-phone-col">
          <div className="cs-phone">{transcript}</div>
        </div>
      </div>
    </div>
  );
}
