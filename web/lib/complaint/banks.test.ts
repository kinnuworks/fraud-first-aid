import { describe, expect, it } from 'vitest';
import { bankFraudLine } from './banks';

describe('bankFraudLine', () => {
  it('finds the bank from the IFSC the caller gave', () => {
    const b = bankFraudLine('State Bank of India, BANGALORE (SBIN0000813)');
    expect(b?.bank).toBe('State Bank of India');
    expect(b?.phone).toMatch(/1800 1234/);
    expect(b?.source).toMatch(/^https:\/\/sbi\.bank\.in\//);
  });
  it('finds the bank from a spoken name', () => {
    expect(bankFraudLine('hdfc')?.bank).toBe('HDFC Bank');
    expect(bankFraudLine('Punjab National Bank')?.bank).toBe('Punjab National Bank');
    expect(bankFraudLine('ICICI bank')?.bank).toBe('ICICI Bank');
  });
  it('says nothing for a bank we have not checked, rather than guess', () => {
    expect(bankFraudLine('Some Cooperative Bank')).toBeNull();
    expect(bankFraudLine('Indian Overseas Bank (IOBA0000001)')).toBeNull();
  });
  it('does not confuse Indian Bank with Indian Overseas Bank or Bank of India', () => {
    expect(bankFraudLine('Indian Bank')?.bank).toBe('Indian Bank');
    expect(bankFraudLine('Indian Overseas Bank')).toBeNull();
  });
});
