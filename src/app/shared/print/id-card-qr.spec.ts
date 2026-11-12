import { idCardNumber, idCardQrDataUrl, idCardQrPayload } from './id-card-qr';

describe('ID card QR helpers', () => {
  it('uses the existing attendance payload for students', () => {
    expect(idCardQrPayload('student', 'student-1')).toBe('TCA:student-1');
  });

  it('namespaces coach payloads so they cannot match a student id', () => {
    expect(idCardQrPayload('coach', 'coach-1')).toBe('TCA:coach:coach-1');
  });

  it('namespaces guardian payloads separately from students and coaches', () => {
    expect(idCardQrPayload('parent', 'parent-1')).toBe('TCA:parent:parent-1');
  });

  it('rejects an empty holder id', () => {
    expect(() => idCardQrPayload('student', '  ')).toThrow('required');
  });

  it('builds readable card numbers from real codes', () => {
    expect(idCardNumber('student', 'TCA-STU-0001')).toBe('ID-STU-TCASTU0001');
    expect(idCardNumber('coach', 'EMP 42')).toBe('ID-COA-EMP42');
    expect(idCardNumber('parent', 'parent-1')).toBe('ID-PAR-PARENT1');
    expect(idCardNumber('student', '')).toBe('ID-STU-UNASSIGNED');
  });

  it('renders a PNG data URL that can be embedded in the card', async () => {
    const url = await idCardQrDataUrl('TCA:student-1');
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });
});
