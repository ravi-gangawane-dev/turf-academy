import * as qrcode from 'qrcode';

/**
 * Lazy boundary for the QR renderer.
 *
 * `qrcode` is a CommonJS package (`module.exports = require('./server')` with a
 * `browser` map). A *dynamic* import of the package itself works on the dev
 * server, which pre-bundles dependencies to ESM, but the production build emits
 * it into a lazy chunk with no ESM exports at all - the namespace comes back
 * empty and calling the destructured function throws "<minified> is not a
 * function" only on the deployed site.
 *
 * Importing this ESM wrapper dynamically instead keeps the encoder out of the
 * main bundle while guaranteeing the lazy chunk exports a real symbol.
 */

export interface QrEncodeOptions {
  readonly errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  readonly margin?: number;
  readonly width?: number;
  readonly color?: { readonly dark?: string; readonly light?: string };
}

type QrRenderer = (text: string, options?: QrEncodeOptions) => Promise<string>;

/** Resolves the renderer through both CommonJS interop shapes. */
function qrRenderer(): QrRenderer {
  for (const candidate of [qrcode, (qrcode as { default?: unknown }).default]) {
    const render = (candidate as { toDataURL?: unknown } | undefined)?.toDataURL;
    if (typeof render === 'function') return render as QrRenderer;
  }
  throw new Error('The QR code renderer is not available in this build.');
}

export function encodeQrDataUrl(text: string, options?: QrEncodeOptions): Promise<string> {
  return qrRenderer()(text, options);
}
