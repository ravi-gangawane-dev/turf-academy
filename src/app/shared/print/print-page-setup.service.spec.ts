import { TestBed } from '@angular/core/testing';
import { PRINT_DEFAULT_PAGE_SETUP } from './print-page-setup';
import { PrintPageSetupService } from './print-page-setup.service';

const STORAGE_KEY = 'academy-print-page-setup';
const STYLE_ID = 'academy-print-page-setup-style';

function service(): PrintPageSetupService {
  return TestBed.inject(PrintPageSetupService);
}

describe('PrintPageSetupService', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById(STYLE_ID)?.remove();
    TestBed.resetTestingModule();
  });

  it('returns the per-document default until a choice is saved', () => {
    const setup = service();

    expect(setup.setupFor('receipt')).toEqual({ size: 'a5', orientation: 'portrait' });
    expect(setup.setupFor('attendance-matrix')).toEqual({
      size: 'a4',
      orientation: 'landscape',
    });
    expect(setup.hasOverride('receipt')).toBe(false);
  });

  it('remembers a choice for one document type only', () => {
    const setup = service();

    expect(setup.save('receipt', { size: 'a4', orientation: 'landscape' })).toEqual({
      size: 'a4',
      orientation: 'landscape',
    });
    expect(setup.hasOverride('receipt')).toBe(true);
    expect(setup.setupFor('receipt')).toEqual({ size: 'a4', orientation: 'landscape' });
    expect(setup.setupFor('invoice')).toEqual({ size: 'a4', orientation: 'portrait' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      receipt: { size: 'a4', orientation: 'landscape' },
    });
  });

  it('restores stored choices and ignores corrupt or unknown entries', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        statement: { size: 'letter', orientation: 'landscape' },
        invoice: { size: 'legal', orientation: 'portrait' },
        unknown: { size: 'a4', orientation: 'portrait' },
      }),
    );

    const setup = service();

    expect(setup.setupFor('statement')).toEqual({ size: 'letter', orientation: 'landscape' });
    expect(setup.setupFor('invoice')).toEqual(PRINT_DEFAULT_PAGE_SETUP.invoice);
    expect(setup.setupFor('profile-sheet')).toEqual(PRINT_DEFAULT_PAGE_SETUP['profile-sheet']);
  });

  it('refuses to override fixed-geometry ID cards', () => {
    const setup = service();

    setup.save('id-card', { size: 'a4', orientation: 'landscape' });

    expect(setup.setupFor('id-card')).toEqual({ size: 'a4', orientation: 'portrait' });
    expect(setup.hasOverride('id-card')).toBe(false);
  });

  it('rejects malformed setup values', () => {
    const setup = service();

    // Deliberately invalid input mirrors a stale or tampered storage value.
    const invalid = { size: 'legal', orientation: 'portrait' } as unknown as {
      size: 'a4';
      orientation: 'portrait';
    };
    setup.save('receipt', invalid);

    expect(setup.setupFor('receipt')).toEqual(PRINT_DEFAULT_PAGE_SETUP.receipt);
    expect(setup.hasOverride('receipt')).toBe(false);
  });

  it('applies the remembered rule for one print run and clears it afterwards', () => {
    const setup = service();
    setup.save('profile-sheet', { size: 'letter', orientation: 'portrait' });

    setup.applyForPrint('profile-sheet');
    const style = document.getElementById(STYLE_ID);

    expect(style?.textContent).toContain(
      '@page profile-page { size: 215.9mm 279.4mm; margin: 12mm; }',
    );

    setup.clearPrintSetup();
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });

  it('falls back to the document default after a reset', () => {
    const setup = service();
    setup.save('receipt', { size: 'a4', orientation: 'landscape' });

    expect(setup.reset('receipt')).toEqual({ size: 'a5', orientation: 'portrait' });
    expect(setup.hasOverride('receipt')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{}');
  });
});
