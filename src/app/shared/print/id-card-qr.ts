import * as qrcode from 'qrcode';

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

type QrRenderer = (text: string, options?: QrOptions) => Promise<string>;

interface QrOptions {
  readonly errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  readonly margin?: number;
  readonly width?: number;
  readonly color?: { readonly dark?: string; readonly light?: string };
}

/**
 * `qrcode` is a CommonJS package (`module.exports = require('./server')` with a
 * `browser` map). Reading a named export off a *dynamic* import of it works in
 * the dev server, which pre-bundles dependencies to ESM, but the production
 * build emits the package into a lazy chunk with no ESM exports at all - the
 * namespace comes back empty and calling the destructured function throws
 * "<minified> is not a function" only on the deployed site.
 *
 * So the package is imported statically and the renderer is resolved through
 * both interop shapes (named export, or `default`) at runtime.
 */
function qrRenderer(): QrRenderer {
  for (const candidate of [qrcode, (qrcode as { default?: unknown }).default]) {
    const render = (candidate as { toDataURL?: unknown } | undefined)?.toDataURL;
    if (typeof render === 'function') return render as QrRenderer;
  }
  throw new Error('The QR code renderer is not available in this build.');
}

/** Renders a printable QR image without adding a second QR dependency. */
export async function idCardQrDataUrl(payload: string): Promise<string> {
  return qrRenderer()(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#0b2b1c', light: '#ffffff' },
  });
}
