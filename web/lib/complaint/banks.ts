// Each bank's own fraud-reporting line, read on the bank's own website on 19 Nov 2026 and checked
// a second time by a separate reader (9 of 13 confirmed; Kotak, Canara, IDFC FIRST and Federal dropped) (research/bank-fraud-contacts.md). Only those banks: for any
// other bank the pack says to call the number on the back of the card, and 1930.
export type FraudLine = { code: string; bank: string; phone: string; also?: string; source: string; match: RegExp };

const LINES: FraudLine[] = [
  { code: 'SBIN', bank: 'State Bank of India', phone: '1800 1234 or 1800 2100', source: 'https://sbi.bank.in/web/customer-care/contact-centre', match: /\b(state bank|sbi)\b/i },
  { code: 'HDFC', bank: 'HDFC Bank', phone: '1800 258 6161', source: 'https://www.hdfc.bank.in/personal/need-help/report-unauthorized-transactions', match: /\bhdfc\b/i },
  { code: 'ICIC', bank: 'ICICI Bank', phone: '1800 2662', source: 'https://www.icici.bank.in/personal-banking/help/online-safe-banking/report-unauthorized-transaction', match: /\bicici\b/i },
  { code: 'UTIB', bank: 'Axis Bank', phone: '1930, then the "Report A Fraud" form on axis.bank.in', source: 'https://www.axis.bank.in/fraud-awareness', match: /\baxis\b/i },
  { code: 'PUNB', bank: 'Punjab National Bank', phone: '1800 1800 or 1800 2021', source: 'https://pnb.bank.in/security-alerts.html', match: /\b(punjab national|pnb)\b/i },
  { code: 'BARB', bank: 'Bank of Baroda', phone: '1800 5700 or 1800 5000 (option 1 for fraud)', source: 'https://bankofbaroda.bank.in/contact-us', match: /\b(bank of baroda|baroda|bob)\b/i },
  { code: 'UBIN', bank: 'Union Bank of India', phone: '1800 2222 44 or 1800 2222 43', source: 'https://www.unionbankofindia.bank.in/en/common/cyber-security', match: /\bunion bank\b/i },
  { code: 'INDB', bank: 'IndusInd Bank', phone: '1860 267 7777', source: 'https://www.indusind.bank.in/in/en/personal/customer-limited-liability.html', match: /\bindusind\b/i },
  { code: 'IDIB', bank: 'Indian Bank', phone: '1800 1700', source: 'https://indianbank.bank.in/en/customer-complaints-/-awareness', match: /\bindian bank\b/i },
];

export function bankFraudLine(victimBank: string): FraudLine | null {
  // An IFSC's first four letters are the bank (RBI's IFSC format), so a code beats a name.
  const ifsc = /\b([A-Z]{4})0[A-Z0-9]{6}\b/.exec(victimBank.toUpperCase());
  if (ifsc) return LINES.find((l) => l.code === ifsc[1]) ?? null;
  return LINES.find((l) => l.match.test(victimBank)) ?? null;
}
