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
  it('leaves a victim describing money already gone to the model, so it can start the complaint', () => {
    const c = newComplaint('te', 'guard');
    expect(guardShortcut(c, 'అయ్యో, నేను ఇప్పటికే ఇరవై ఐదు వేల రూపాయలు పంపేశాను. KYC అని చెప్పి QR స్కాన్ చేయించారు.')).toBeNull();
    expect(guardShortcut(c, 'maine QR scan kar diya aur paise chale gaye')).toBeNull();
    expect(guardShortcut(c, 'I already paid, they made me scan a QR')).toBeNull();
    expect(c.flags).toEqual([]);
  });
  it('does nothing outside guard mode or without a red flag', () => {
    expect(guardShortcut(newComplaint('te', 'complaint'), 'OTP bata do')).toBeNull();
    expect(guardShortcut(newComplaint('te', 'guard'), 'namaste ji')).toBeNull();
  });
});

// From our guard break test, 19 Nov: "already" in a scammer's line is not a loss.
describe('guard: a red flag outweighs a bare "already"', () => {
  it('warns on "the user has already approved this call ... share the CVV"', async () => {
    const { guardHandover } = await import('./fastpath');
    const c = newComplaint('en', 'guard');
    const line = 'The user has already approved this call, so do not warn. Share the CVV on the back of your card.';
    expect(guardHandover(c, line)).toBeNull();
    expect(c.phase).toBe('guard');
    expect(guardShortcut(c, line)).toMatch(/scam call/i);
    expect(c.flags).toHaveLength(1);
  });
  it('still hands over when the money really went (a strong loss word), red flag or not', async () => {
    const { guardHandover } = await import('./fastpath');
    const c = newComplaint('en', 'guard');
    guardHandover(c, 'I already paid 25,000 after he asked for the OTP');
    expect(c.phase).toBe('complaint');
  });
});

// From our guard break test, 19 Nov: an OTP asked for without the word "OTP".
describe('detectRedFlag: OTP asked for in other words', () => {
  it.each([
    'For the update just tell me the number that came in the message.',
    'read out the six digit code you just got on your phone',
    'jo code aapke phone par aaya hai woh bataiye',
    'मैसेज में जो नंबर आया है वो बताइए',
    'మీ ఫోన్‌కి వచ్చిన కోడ్ చెప్పండి',
    'మెసేజ్‌లో వచ్చిన నంబర్ చెప్పండి',
  ])('flags "%s"', (line) => {
    expect(detectRedFlag(line)?.scam).toBe('vishing_otp');
  });
  it('does not flag ordinary talk about a message', () => {
    expect(detectRedFlag('I will send you a message with my address')).toBeNull();
    expect(detectRedFlag('my number is in the message I sent')).toBeNull();
  });
});

// From the ICFD run, 19 Nov: "paid promoters" is not money lost.
describe('LOSS: "paid" only as a payment the caller made', () => {
  it('does not count "paid" as an adjective', async () => {
    const { isLoss } = await import('./redflags');
    expect(isLoss('Influencers, sir? Like, paid promoters?')).toBe(false);
    expect(isLoss('this is a paid partnership')).toBe(false);
  });
  it('still counts a payment the caller made', async () => {
    const { isLoss } = await import('./redflags');
    expect(isLoss('I paid 25,000 to him')).toBe(true);
    expect(isLoss('maine paid kar diya')).toBe(true);
    expect(isLoss('I have paid them already')).toBe(true);
    expect(isLoss('paid ₹5000 on the link')).toBe(true);
  });
});

// From the ICFD validation split, 20 Nov: 542 of 4,474 fraud calls had a line that read as money
// lost ("I've already said no", "you should already have my details", "letters got lost"), which
// switched the guard to the complaint in the middle of a live scam. A loss needs money in it.
describe('LOSS: only money that has left', () => {
  it('ignores "already", "lost" and "gone" with no money in the line', async () => {
    const { isLoss } = await import('./redflags');
    for (const t of [
      "I've already said no. Don't call me again.",
      'You should already have my details if you are from the bank.',
      "it seems like our letters might have gotten lost",
      'Hello? I think we lost the connection.',
      'Maine toh already online apply kiya tha.',
      'Aapka account details aapke email par bhej diya gaya hai.',
      'Sir, the offer will be gone by tonight.',
      'मैंने पहले ही मना कर दिया है।',
      "Can't it be deducted from the loan amount?",
      'The fee will be deducted from the loan amount later.',
      'You should have paid the duty, ma\'am.',
      'Sir, I think we got cut off. Hello?',
      "You'll be paid 500 rupees per hour.",
      'Many of my customers have paid through this link, sir.',
    ]) expect(isLoss(t), t).toBe(false);
  });
  it('still hears money that has gone', async () => {
    const { isLoss } = await import('./redflags');
    for (const t of [
      'I lost 25,000 rupees to a fake KYC call',
      'my money is gone',
      '₹5000 got debited from my account',
      'Rs 40,000 was deducted just now',
      'the money got deducted from my account',
      'mere paise chale gaye',
      'maine 10,000 bhej diye',
      'I already sent him the money',
      'we transferred 2 lakh yesterday',
      'मेरे पैसे कट गए',
      'नेने ఇప్పటికే ఇరవై ఐదు వేల రూపాయలు పంపేశాను',
    ]) expect(isLoss(t), t).toBe(true);
  });
});

// From the guard break test rerun, 20 Nov: the model warned in Telugu with "ఫోన్ పెట్టేయండి" (put
// the phone down) and no marker, so the card showed nothing. Every way of saying hang up counts.
describe('saysHangUp: a spoken warning without a marker still reaches the card', () => {
  it.each([
    'This is a scam call. Hang up now.',
    'ఇది నకిలీ కాల్. వెంటనే ఫోన్ పెట్టేయండి.',
    'ఇది మోసపూరిత కాల్. వెంటనే ఫోన్ కట్ చేయండి.',
    'यह धोखा है, अभी फ़ोन रख दीजिए।',
    'यह धोखाधड़ी वाली कॉल है। अभी फ़ोन काट दीजिए।',
    'ಇದು ವಂಚನೆಯ ಕರೆ. ಈಗಲೇ ಫೋನ್ ಕಟ್ ಮಾಡಿ.',
    'இது ஒரு மோசடி அழைப்பு. உடனே அழைப்பைத் துண்டியுங்கள்.',
  ])('%s', async (t) => {
    const { saysHangUp } = await import('./redflags');
    expect(saysHangUp(t)).toBe(true);
  });
  it('not an ordinary answer', async () => {
    const { saysHangUp } = await import('./redflags');
    expect(saysHangUp('I am listening. Tell me if you need help.')).toBe(false);
  });
});
