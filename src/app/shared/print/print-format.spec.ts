import {
  amountInWords,
  printMoney,
  printProfileReference,
  printStatusLabel,
  printStatusTone,
} from './print-format';

describe('print-format', () => {
  it('spells Indian rupee amounts with lakh and crore groups', () => {
    expect(amountInWords(1250.5, 'INR')).toBe(
      'One thousand two hundred fifty rupees and fifty paise only',
    );
    expect(amountInWords(125000, 'INR')).toBe('One lakh twenty five thousand rupees only');
    expect(amountInWords(0, 'INR')).toBe('Zero rupees only');
  });

  it('spells other currencies with western groups', () => {
    expect(amountInWords(100, 'USD')).toBe('One hundred US dollars only');
    expect(amountInWords(2.01, 'USD')).toBe('Two US dollars and one cent only');
  });

  it('formats money with the document currency', () => {
    expect(printMoney(1250.5, 'INR')).toContain('1,250.50');
    expect(printMoney(0, 'USD')).toContain('0.00');
  });

  it('builds a stable profile sheet reference from the real academy code', () => {
    expect(printProfileReference('student', 'TCA-1001')).toBe('PRF-STU-TCA1001');
    expect(printProfileReference('parent', 'p 1')).toBe('PRF-PAR-P1');
    expect(printProfileReference('coach', 'EMP-42')).toBe('PRF-COA-EMP42');
    expect(printProfileReference('student', '')).toBe('PRF-STU-UNASSIGNED');
  });

  it('maps statuses to readable labels and tones', () => {    expect(printStatusLabel('successful')).toBe('Paid');
    expect(printStatusLabel('partially_paid')).toBe('Partially paid');
    expect(printStatusLabel('on_hold')).toBe('On hold');
    expect(printStatusLabel(null)).toBe('Paid');
    expect(printStatusTone('paid')).toBe('paid');
    expect(printStatusTone('overdue')).toBe('due');
    expect(printStatusTone('pending')).toBe('pending');
  });
});
