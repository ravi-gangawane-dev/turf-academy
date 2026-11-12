import type {
  PrintDocument,
  PrintOrientation,
  PrintPageSetup,
  PrintPaperSize,
} from './print-document.models';

export interface PrintPaperDimensions {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly marginMm: number;
}

export interface PrintPageSetupOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** Portrait base sizes in millimetres, so a size label always maps to real paper. */
const PAPER: Record<PrintPaperSize, { readonly widthMm: number; readonly heightMm: number; readonly label: string }> = {
  a4: { widthMm: 210, heightMm: 297, label: 'A4' },
  a5: { widthMm: 148, heightMm: 210, label: 'A5' },
  letter: { widthMm: 215.9, heightMm: 279.4, label: 'Letter' },
};

export const PRINT_PAPER_SIZES: readonly PrintPageSetupOption<PrintPaperSize>[] = [
  { value: 'a4', label: 'A4' },
  { value: 'a5', label: 'A5' },
  { value: 'letter', label: 'Letter' },
];

export const PRINT_ORIENTATIONS: readonly PrintPageSetupOption<PrintOrientation>[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

/** Named `@page` rule each template selects through its `page:` property. */
const PAGE_NAMES: Record<PrintDocument['kind'], string> = {
  invoice: 'invoice-page',
  receipt: 'receipt-page',
  statement: 'statement-page',
  'refund-receipt': 'refund-page',
  'attendance-register': 'attendance-page',
  'attendance-matrix': 'attendance-matrix-page',
  'id-card': 'id-card-page',
  'enrollment-confirmation': 'enrollment-page',
  'batch-roster': 'roster-page',
  'profile-sheet': 'profile-page',
  table: 'report-page',
};

/** Margins match `print-document.css` so an unchanged setup prints identically. */
const PAGE_MARGINS: Record<PrintDocument['kind'], number> = {
  invoice: 14,
  receipt: 8,
  statement: 12,
  'refund-receipt': 8,
  'attendance-register': 12,
  'attendance-matrix': 10,
  'id-card': 0,
  'enrollment-confirmation': 12,
  'batch-roster': 12,
  'profile-sheet': 12,
  table: 14,
};

export const PRINT_DEFAULT_PAGE_SETUP: Record<PrintDocument['kind'], PrintPageSetup> = {
  invoice: { size: 'a4', orientation: 'portrait' },
  receipt: { size: 'a5', orientation: 'portrait' },
  statement: { size: 'a4', orientation: 'portrait' },
  'refund-receipt': { size: 'a5', orientation: 'portrait' },
  'attendance-register': { size: 'a4', orientation: 'portrait' },
  'attendance-matrix': { size: 'a4', orientation: 'landscape' },
  'id-card': { size: 'a4', orientation: 'portrait' },
  'enrollment-confirmation': { size: 'a4', orientation: 'portrait' },
  'batch-roster': { size: 'a4', orientation: 'portrait' },
  'profile-sheet': { size: 'a4', orientation: 'portrait' },
  table: { size: 'a4', orientation: 'portrait' },
};

export const FALLBACK_PAGE_SETUP: PrintPageSetup = { size: 'a4', orientation: 'portrait' };

/**
 * CR80 cards are positioned in millimetres on a fixed 210 × 297mm sheet, so a
 * different paper size would break the crop geometry. Every other document
 * reflows to the chosen paper.
 */
export function supportsPageSetup(kind: PrintDocument['kind']): boolean {
  return kind !== 'id-card';
}

export function isPrintPageSetup(value: unknown): value is PrintPageSetup {
  if (!value || typeof value !== 'object') return false;
  const setup = value as Record<string, unknown>;
  return (
    PRINT_PAPER_SIZES.some((option) => option.value === setup['size']) &&
    PRINT_ORIENTATIONS.some((option) => option.value === setup['orientation'])
  );
}

export function pageSetupLabel(setup: PrintPageSetup): string {
  const paper = PAPER[setup.size]?.label ?? PAPER.a4.label;
  return `${paper} ${setup.orientation}`;
}

/** Paper dimensions after orientation, plus the document's own margin. */
export function pageSetupDimensions(
  kind: PrintDocument['kind'],
  setup: PrintPageSetup,
): PrintPaperDimensions {
  const paper = PAPER[setup.size] ?? PAPER.a4;
  const landscape = setup.orientation === 'landscape';
  return {
    widthMm: landscape ? paper.heightMm : paper.widthMm,
    heightMm: landscape ? paper.widthMm : paper.heightMm,
    marginMm: PAGE_MARGINS[kind] ?? 12,
  };
}

function millimetres(value: number): string {
  return `${Math.round(value * 10) / 10}mm`;
}

/** Every top-level sheet that reserves a full page, so footers meet the paper edge. */
const PAGE_HEIGHT_SELECTORS = [
  '.print-page',
  '.print-sheet--invoice',
  '.print-sheet--receipt',
  '.print-sheet--profile',
  '.print-sheet--refund',
] as const;

/**
 * Late `@page` rule that overrides the named default for one print run, plus a
 * matching content height so full-page footers still sit at the paper edge.
 */
export function printPageRule(kind: PrintDocument['kind'], setup: PrintPageSetup): string {
  const name = PAGE_NAMES[kind];
  const dimensions = pageSetupDimensions(kind, setup);
  const rules = [
    `@page ${name} { size: ${millimetres(dimensions.widthMm)} ${millimetres(dimensions.heightMm)}; margin: ${millimetres(dimensions.marginMm)}; }`,
  ];
  if (kind !== 'id-card') {
    const height = millimetres(dimensions.heightMm - dimensions.marginMm * 2);
    const selectors = PAGE_HEIGHT_SELECTORS.map(
      (selector) => `app-print-document-host ${selector}`,
    ).join(', ');
    rules.push(
      `@media print { ${selectors} { min-height: calc(${height}) !important; } }`,
    );
  }
  return rules.join('\n');
}
