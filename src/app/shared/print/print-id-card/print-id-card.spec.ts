import { TestBed } from '@angular/core/testing';
import { PrintIdCardDocument } from '../print-document.models';
import { PrintIdCard } from './print-id-card';

const card: PrintIdCardDocument = {
  kind: 'id-card',
  brand: {
    name: 'Turf Cricket Academy',
    code: 'TCA',
    logoUrl: 'https://cdn.example/logo.png',
    address: 'Sector 21, Kharadi',
    phone: '+91 98765 43210',
    email: 'accounts@example.com',
    currencyCode: 'INR',
    timezone: 'Asia/Kolkata',
  },
  issuedAt: '2026-11-03T06:00:00Z',
  cardNumber: 'ID-STU-TCASTU0001',
  holderType: 'student',
  holderId: 'student-1',
  fullName: 'Aarav Patil',
  holderCode: 'TCA-STU-0001',
  subtitle: 'Morning Elite · B-MOR',
  photoUrl: null,
  qrPayload: 'TCA:student-1',
  qrDataUrl: 'data:image/png;base64,AAAA',
  details: [
    { label: 'Guardian', value: 'Ravi Patil (Father)' },
    { label: 'Blood group', value: 'B+' },
  ],
  validityNote: 'Valid while actively enrolled',
};

function render(document: PrintIdCardDocument = card) {
  TestBed.configureTestingModule({ imports: [PrintIdCard] });
  const fixture = TestBed.createComponent(PrintIdCard);
  fixture.componentRef.setInput('card', document);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PrintIdCard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('prints two fronts and two backs as separate A4 sheets', () => {
    const element = render();

    expect(element.querySelector('.print-sheet--id-card')).toBeTruthy();
    expect(element.querySelectorAll('.id-card-sheet')).toHaveLength(2);
    expect(element.querySelectorAll('.id-card-slot')).toHaveLength(4);
    expect(element.querySelectorAll('.id-card--front')).toHaveLength(2);
    expect(element.querySelectorAll('.id-card--back')).toHaveLength(2);
    expect(element.querySelectorAll('.crop')).toHaveLength(16);
  });

  it('shows the live student identity, batch and card number', () => {
    const element = render();
    const text = element.textContent ?? '';

    expect(text).toContain('Student ID');
    expect(text).toContain('Aarav Patil');
    expect(text).toContain('TCA-STU-0001');
    expect(text).toContain('Morning Elite · B-MOR');
    expect(text).toContain('ID-STU-TCASTU0001');
    expect(text).toContain('Valid while actively enrolled');
    expect(text).toContain('Ravi Patil (Father)');
    expect(text).toContain('B+');
    expect(element.querySelector('.id-card-photo span')?.textContent?.trim()).toBe('AP');
  });

  it('embeds the generated QR and the encoded payload', () => {
    const element = render();
    const qr = element.querySelector('.id-card-qr img') as HTMLImageElement | null;

    expect(qr?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(qr?.getAttribute('alt')).toContain('Aarav Patil');
    expect(element.querySelector('.id-card-qr small')?.textContent?.trim()).toBe('TCA:student-1');
  });

  it('uses the real photo when one is available and labels coach cards', () => {
    const element = render({
      ...card,
      holderType: 'coach',
      photoUrl: 'https://cdn.example/coach.jpg',
      subtitle: 'Batting, Fielding',
      validityNote: 'Valid while employed at the academy',
    });

    expect(element.querySelector('.id-card-photo img')?.getAttribute('src')).toBe(
      'https://cdn.example/coach.jpg',
    );
    expect(element.textContent).toContain('Coach ID');
    expect(element.textContent).toContain('Batting, Fielding');
    expect(element.textContent).toContain('Valid while employed at the academy');
  });

  it('labels guardian cards and keeps linked children, pickup rights and the revocation note', () => {
    const element = render({
      ...card,
      holderType: 'parent',
      holderId: 'parent-1',
      cardNumber: 'ID-PAR-PARENT1',
      holderCode: 'parent-1',
      fullName: 'Ravi Patil',
      subtitle: 'Father',
      details: [
        { label: 'Children', value: 'Aarav Patil (TCA-STU-0001), Diya Patil (TCA-STU-0002)' },
        { label: 'Pickup', value: 'Aarav Patil: authorised; Diya Patil: not authorised' },
        { label: 'Revocation', value: 'Report a lost card to the academy.' },
      ],
      validityNote: 'Valid while linked to an active student · revoke if lost',
    });
    const text = element.textContent ?? '';

    expect(text).toContain('Guardian ID');
    expect(text).toContain('ID-PAR-PARENT1');
    expect(text).toContain('Aarav Patil (TCA-STU-0001)');
    expect(text).toContain('Diya Patil: not authorised');
    expect(text).toContain('Report a lost card to the academy.');
    expect(text).toContain('revoke if lost');
    expect(element.querySelector('.id-card-photo span')?.textContent?.trim()).toBe('RP');
  });
});
