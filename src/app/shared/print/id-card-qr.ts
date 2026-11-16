import { PrintIdCardHolder } from './print-document.models';

/**
 * Student cards reuse the existing attendance scanner payload (`TCA:<id>`).
 * Coach and guardian cards carry namespaced payloads so one holder id can
 * never be mistaken for another.
 */
export function idCardQrPayload(holder: PrintIdCardHolder, id: string): string {
  const clean = id.trim();
  if (!clean) throw new Error('An id is required to build the card QR code.');
  if (holder === 'student') return `TCA:${clean}`;
  return `TCA:${holder}:${clean}`;
}

/** Human-readable card number derived from the real academy id or code. */
export function idCardNumber(holder: PrintIdCardHolder, source: string): string {
  const clean = source
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 24);
  const prefix = holder === 'coach' ? 'ID-COA' : holder === 'parent' ? 'ID-PAR' : 'ID-STU';
  return `${prefix}-${clean || 'UNASSIGNED'}`;
}

/**
 * Renders a printable QR image without adding a second QR dependency.
 *
 * The encoder lives behind `./qr-encode` and is imported dynamically: the
 * wrapper is ESM with a real export, so its lazy chunk survives the production
 * build (see the note in that file), while the id-card encoder stays out of the
 * main bundle until a card is actually printed.
 */
export async function idCardQrDataUrl(payload: string): Promise<string> {
  const { encodeQrDataUrl } = await import('./qr-encode');
  return encodeQrDataUrl(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#0b2b1c', light: '#ffffff' },
  });
}
