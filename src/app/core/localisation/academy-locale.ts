/**
 * The academy has one currency and one timezone but no separate locale column.
 * Currency is the best available signal for English number/date conventions:
 * INR uses Indian digit grouping, USD uses US grouping, and so on. Everything
 * falls back to the existing default so a missing or typo'd currency code never
 * breaks formatting.
 */
const LOCALE_BY_CURRENCY: Readonly<Record<string, string>> = {
  AED: 'en-AE',
  AUD: 'en-AU',
  CAD: 'en-CA',
  EUR: 'en-IE',
  GBP: 'en-GB',
  INR: 'en-IN',
  NZD: 'en-NZ',
  SAR: 'en-SA',
  SGD: 'en-SG',
  USD: 'en-US',
  ZAR: 'en-ZA',
};

export const DEFAULT_ACADEMY_LOCALE = 'en-IN';
export const DEFAULT_ACADEMY_TIMEZONE = 'Asia/Kolkata';

export function academyLocaleForCurrency(currencyCode: string | null | undefined): string {
  const code = String(currencyCode ?? '').trim().toUpperCase();
  return LOCALE_BY_CURRENCY[code] ?? DEFAULT_ACADEMY_LOCALE;
}

/** True for database date-only values such as `2026-11-15`. */
export function isIsoDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Angular's `formatDate` reads a date-only string as local midnight, which
 * shifts the day in most timezones. This returns the matching UTC instant.
 */
export function utcDateOnly(value: string | null | undefined): Date | string {
  const raw = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value ?? '');
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? raw : date;
}

/** Adds calendar days without depending on the browser timezone. */
export function isoDatePlusDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
