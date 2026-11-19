import { describe, expect, it } from 'vitest';
import { scriptLang } from './script';

describe('scriptLang', () => {
  it('reads the language from the script of a transcript', () => {
    expect(scriptLang('నా డబ్బు పోయింది')).toBe('te');
    expect(scriptLang('என் பணம் போய்விட்டது')).toBe('ta');
    expect(scriptLang('ನನ್ನ ಹಣ ಹೋಯಿತು')).toBe('kn');
    expect(scriptLang('എന്റെ പണം പോയി')).toBe('ml');
    expect(scriptLang('আমার টাকা চলে গেছে')).toBe('bn');
    expect(scriptLang('મારા પૈસા ગયા')).toBe('gu');
    expect(scriptLang('ਮੇਰੇ ਪੈਸੇ ਚਲੇ ਗਏ')).toBe('pa');
    expect(scriptLang('मेरे पैसे चले गए')).toBe('hi');
    expect(scriptLang('my money is gone, please help')).toBe('en');
  });
  it('lets the Indian script win in code-mixed speech, and stays unsure on very little text', () => {
    expect(scriptLang('UTR నంబర్ నాలుగు సున్నా')).toBe('te');
    expect(scriptLang('ok')).toBeNull();
    expect(scriptLang('4021 7788')).toBeNull();
  });
});
