'use client';

import type { ReactNode } from 'react';
import { Logo } from './design/Logo';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  transcript?: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
};

// Call screen: the complaint card (biggest) on the left; the agent, the talk control and the
// transcript (smallest) on the right.
export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  transcript,
  visualizer,
  controls,
  onEndConversation,
}: QuickstartConversationLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-left">
      <div className="up-wrap">
        <header className="up-callbar">
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
        <div className="up-callgrid">
          <main className="flex min-w-0 flex-col gap-4">{transcriptPanel}</main>
          <aside className="up-orbcol">
            <div className="up-orb">{visualizer}</div>
            <div>{controls}</div>
            {transcript}
          </aside>
        </div>
      </div>
    </div>
  );
}
