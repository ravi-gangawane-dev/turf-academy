import { TestBed } from '@angular/core/testing';
import { PrintIdCardInput } from '../print-document.models';
import { PrintIdCardDialog } from './print-id-card-dialog';

const card: PrintIdCardInput = {
  issuedAt: '2026-11-03T06:00:00Z',
  cardNumber: 'ID-STU-TCASTU0001',
  holderType: 'student',
  holderId: 'student-1',
  fullName: 'Aarav Patil',
  holderCode: 'TCA-STU-0001',
  subtitle: 'Morning Elite · B-MOR',
  photoUrl: null,
  details: [{ label: 'Guardian', value: 'Ravi Patil (Father)' }],
  validityNote: 'Valid while actively enrolled',
};

function setup(open = true) {
  TestBed.configureTestingModule({ imports: [PrintIdCardDialog] });
  const fixture = TestBed.createComponent(PrintIdCardDialog);
  fixture.componentRef.setInput('open', open);
  fixture.componentRef.setInput('card', card);
  fixture.detectChanges();
  return fixture;
}

function button(fixture: ReturnType<typeof setup>, label: string): HTMLButtonElement {
  const match = [...fixture.nativeElement.querySelectorAll('button')].find((element) =>
    (element.textContent ?? '').trim().includes(label),
  );
  if (!match) throw new Error(`Button ${label} was not rendered.`);
  return match as HTMLButtonElement;
}

describe('PrintIdCardDialog', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows the live card summary when opened', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Student ID card — Aarav Patil');
    expect(text).toContain('Student code');
    expect(text).toContain('TCA-STU-0001');
    expect(text).toContain('Morning Elite · B-MOR');
    expect(text).toContain('ID-STU-TCASTU0001');
    expect(text).toContain('duplex printing');
  });

  it('labels guardian cards with the parent record fields', () => {
    const fixture = setup();
    fixture.componentRef.setInput('card', {
      ...card,
      holderType: 'parent',
      holderId: 'parent-1',
      cardNumber: 'ID-PAR-PARENT1',
      holderCode: 'parent-1',
      fullName: 'Ravi Patil',
      subtitle: 'Father',
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Guardian access');
    expect(text).toContain('Guardian ID card — Ravi Patil');
    expect(text).toContain('Parent ID');
    expect(text).toContain('Relation');
    expect(text).toContain('parent-1');
    expect(text).toContain('Father');
    expect(text).toContain('ID-PAR-PARENT1');
  });

  it('requests preview, PDF and print with the chosen destination', () => {
    const fixture = setup();
    const destinations: string[] = [];
    fixture.componentInstance.prepare.subscribe((destination) => destinations.push(destination));

    button(fixture, 'Preview').click();
    button(fixture, 'Download PDF').click();
    button(fixture, 'Print').click();

    expect(destinations).toEqual(['preview', 'pdf', 'print']);
  });

  it('closes from the cancel button and the backdrop', () => {
    const fixture = setup();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => ++closed);

    button(fixture, 'Cancel').click();
    const backdrop = fixture.nativeElement.querySelector('.id-card-backdrop') as HTMLElement;
    backdrop.click();

    expect(closed).toBe(2);
  });

  it('blocks every action while a document is being prepared', () => {
    const fixture = setup();
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    const destinations: string[] = [];
    fixture.componentInstance.prepare.subscribe((destination) => destinations.push(destination));
    const buttons = [
      ...fixture.nativeElement.querySelectorAll('.id-card-dialog > footer button'),
    ] as HTMLButtonElement[];

    buttons.forEach((element) => element.click());

    expect(destinations).toEqual([]);
    expect(buttons.every((element) => element.disabled)).toBe(true);
  });

  it('shows a preparation error with a retry action', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', 'The ID card could not be prepared.');
    fixture.detectChanges();
    let retries = 0;
    fixture.componentInstance.retry.subscribe(() => ++retries);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.id-card-error')?.textContent).toContain(
      'The ID card could not be prepared.',
    );
    (button(fixture, 'Try again')).click();

    expect(retries).toBe(1);
  });

  it('blocks retry while a document is being prepared', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', 'The ID card could not be prepared.');
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    let retries = 0;
    fixture.componentInstance.retry.subscribe(() => ++retries);

    button(fixture, 'Try again').click();

    expect(retries).toBe(0);
    expect(button(fixture, 'Try again').disabled).toBe(true);
  });

  it('keeps the dialog closed until it is opened', () => {
    const fixture = setup(false);
    expect(fixture.nativeElement.querySelector('.id-card-dialog')).toBeNull();
  });
});
