import { describe, expect, it } from 'vitest';
import { detectRedFlag, guardShortcut } from './redflags';
import { newComplaint } from './session';

describe('detectRedFlag', () => {
  it('spots the clear asks in any script Sarvam writes', () => {
    expect(detectRedFlag('आपके phone पर एक OTP आया होगा, वो मुझे बता दीजिए।')?.scam).toBe('vishing_otp');
    expect(detectRedFlag('మీ ఫోన్‌కి వచ్చిన ఓటీపీ చెప్పండి')?.scam).toBe('vishing_otp');
    expect(detectRedFlag('KYC update ke liye OTP bata dijiye')?.scam).toBe('fake_kyc');
    expect(detectRedFlag('please install AnyDesk')?.scam).toBe('screen_share');
    expect(detectRedFlag('scan this QR code to receive the refund')?.scam).toBe('qr_scan');
    expect(detectRedFlag('enter your UPI PIN to receive money')?.scam).toBe('pin_to_receive');
    expect(detectRedFlag('you are under digital arrest')?.scam).toBe('digital_arrest');
    expect(detectRedFlag('tell me the CVV on the back')?.scam).toBe('vishing_otp');
  });
  it('stays quiet on ordinary talk', () => {
    expect(detectRedFlag('Hello sir, main bank se bol raha hoon')).toBeNull();
    expect(detectRedFlag('haan ji boliye')).toBeNull();
    expect(detectRedFlag('the pinnacle of service, opinion please')).toBeNull();
  });
});

describe('guardShortcut', () => {
  it('returns a fixed warning in the caller language and records the flag once', () => {
    const c = newComplaint('te', 'guard');
    const w = guardShortcut(c, 'आपके phone पर एक OTP आया होगा, वो मुझे बता दीजिए।');
    expect(w).toContain('వెంటనే ఫోన్ కట్ చేయండి');
    expect(c.flags.map((f) => f.scam)).toEqual(['vishing_otp']);
    // the same scam again is left to the model (a short "hang up" reminder)
    expect(guardShortcut(c, 'OTP bata do jaldi')).toBeNull();
  });
  it('does nothing outside guard mode or without a red flag', () => {
    expect(guardShortcut(newComplaint('te', 'complaint'), 'OTP bata do')).toBeNull();
    expect(guardShortcut(newComplaint('te', 'guard'), 'namaste ji')).toBeNull();
  });
});
