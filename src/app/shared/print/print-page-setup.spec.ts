import {
  PRINT_DEFAULT_PAGE_SETUP,
  pageSetupDimensions,
  pageSetupLabel,
  printPageRule,
  supportsPageSetup,
} from './print-page-setup';

describe('print-page-setup', () => {
  it('keeps the documented paper default for every document kind', () => {
    expect(PRINT_DEFAULT_PAGE_SETUP.receipt).toEqual({ size: 'a5', orientation: 'portrait' });
    expect(PRINT_DEFAULT_PAGE_SETUP['refund-receipt']).toEqual({
      size: 'a5',
      orientation: 'portrait',
    });
    expect(PRINT_DEFAULT_PAGE_SETUP['attendance-matrix']).toEqual({
      size: 'a4',
      orientation: 'landscape',
    });
    expect(PRINT_DEFAULT_PAGE_SETUP.invoice).toEqual({ size: 'a4', orientation: 'portrait' });
    expect(PRINT_DEFAULT_PAGE_SETUP['profile-sheet']).toEqual({
      size: 'a4',
      orientation: 'portrait',
    });
  });

  it('swaps the paper dimensions for landscape and keeps the document margin', () => {
    expect(pageSetupDimensions('receipt', { size: 'a5', orientation: 'portrait' })).toEqual({
      widthMm: 148,
      heightMm: 210,
      marginMm: 8,
    });
    expect(pageSetupDimensions('receipt', { size: 'a5', orientation: 'landscape' })).toEqual({
      widthMm: 210,
      heightMm: 148,
      marginMm: 8,
    });
    expect(pageSetupDimensions('invoice', { size: 'letter', orientation: 'portrait' })).toEqual({
      widthMm: 215.9,
      heightMm: 279.4,
      marginMm: 14,
    });
  });

  it('labels the chosen paper and orientation', () => {
    expect(pageSetupLabel({ size: 'a4', orientation: 'portrait' })).toBe('A4 portrait');
    expect(pageSetupLabel({ size: 'a5', orientation: 'landscape' })).toBe('A5 landscape');
    expect(pageSetupLabel({ size: 'letter', orientation: 'portrait' })).toBe('Letter portrait');
  });

  it('emits a late named @page override with a matching content height', () => {
    const rule = printPageRule('receipt', { size: 'a4', orientation: 'landscape' });

    expect(rule).toContain('@page receipt-page { size: 297mm 210mm; margin: 8mm; }');
    expect(rule).toContain('min-height: calc(194mm) !important');
  });

  it('reserves the matching page height on every sheet that has a full-page footer', () => {
    const rule = printPageRule('profile-sheet', { size: 'letter', orientation: 'portrait' });

    expect(rule).toContain('@page profile-page { size: 215.9mm 279.4mm; margin: 12mm; }');
    for (const selector of [
      '.print-page',
      '.print-sheet--invoice',
      '.print-sheet--receipt',
      '.print-sheet--profile',
      '.print-sheet--refund',
    ]) {
      expect(rule).toContain(`app-print-document-host ${selector}`);
    }
    expect(rule).toContain('min-height: calc(255.4mm) !important');
  });

  it('keeps CR80 cards on their fixed sheet without a content-height override', () => {
    expect(supportsPageSetup('id-card')).toBe(false);
    expect(supportsPageSetup('profile-sheet')).toBe(true);

    const rule = printPageRule('id-card', { size: 'a4', orientation: 'portrait' });

    expect(rule).toContain('@page id-card-page { size: 210mm 297mm; margin: 0mm; }');
    expect(rule).not.toContain('min-height');
  });
});
