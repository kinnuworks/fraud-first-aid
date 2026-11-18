'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const LANGS = [
  ['te', 'తెలుగు'],
  ['hi', 'हिन्दी'],
  ['kn', 'ಕನ್ನಡ'],
  ['ta', 'தமிழ்'],
  ['ml', 'മലയാളം'],
  ['bn', 'বাংলা'],
  ['mr', 'मराठी'],
  ['gu', 'ગુજરાતી'],
  ['pa', 'ਪੰਜਾਬੀ'],
  ['en', 'English'],
] as const;

// The chosen language rides in ?lang=, which the call start reads.
function LanguageChips() {
  const [lang, setLang] = useState('te');
  function pick(code: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', code);
    window.history.replaceState(null, '', url);
    setLang(code);
  }
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && LANGS.some(([c]) => c === q)) setLang(q);
    else pick('te');
  }, []);
  return (
    <div role="radiogroup" aria-label="Language" className="mt-6 flex flex-wrap justify-center gap-2">
      {LANGS.map(([code, label]) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          onClick={() => pick(code)}
          className={`rounded-full border px-3 py-1 text-sm ${lang === code ? 'border-primary bg-primary text-black' : 'border-[#2b2b2b] text-white'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  return (
    <div
      className="mx-auto flex w-[min(92vw,26.25rem)] animate-fade-up flex-col items-center rounded-[20px] border border-[#2b2b2b] px-10 py-10 text-center shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
      style={{
        backgroundImage:
          'linear-gradient(164.988deg, rgba(54,54,54,0.2) 1.0596%, rgba(0,0,0,0) 96.089%), linear-gradient(90deg, rgb(16,16,16) 0%, rgb(16,16,16) 100%)',
      }}
    >
      <h1 className="text-[28px] font-medium leading-[1.2] text-white">
        Lost money to a UPI scam? Tell me what happened.
      </h1>
      <p className="mt-[14px] text-sm font-medium leading-6 text-muted-foreground">
        Speak your language: ten to choose from. Keep your bank SMS open: it has the 12-digit UTR.
      </p>
      <LanguageChips />

      <Button
        onClick={onStartConversation}
        disabled={isLoading}
        className="mt-12 h-10 w-full rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white hover:text-black disabled:hover:border-primary disabled:hover:bg-primary disabled:hover:text-black"
        aria-label={
          isLoading
            ? 'Starting conversation with AI agent'
            : 'Start conversation with AI agent'
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          'Start talking'
        )}
      </Button>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
