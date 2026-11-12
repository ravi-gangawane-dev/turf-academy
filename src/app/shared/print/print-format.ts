const CURRENCY_NAMES: Readonly<
  Record<string, { readonly major: string; readonly majorPlural: string; readonly minor: string; readonly minorPlural: string }>
> = {
  INR: { major: 'rupee', majorPlural: 'rupees', minor: 'paise', minorPlural: 'paise' },
  USD: { major: 'US dollar', majorPlural: 'US dollars', minor: 'cent', minorPlural: 'cents' },
  EUR: { major: 'euro', majorPlural: 'euros', minor: 'cent', minorPlural: 'cents' },
  GBP: { major: 'pound', majorPlural: 'pounds', minor: 'penny', minorPlural: 'pence' },
  AED: { major: 'dirham', majorPlural: 'dirhams', minor: 'fils', minorPlural: 'fils' },
  AUD: { major: 'Australian dollar', majorPlural: 'Australian dollars', minor: 'cent', minorPlural: 'cents' },
  CAD: { major: 'Canadian dollar', majorPlural: 'Canadian dollars', minor: 'cent', minorPlural: 'cents' },
  SGD: { major: 'Singapore dollar', majorPlural: 'Singapore dollars', minor: 'cent', minorPlural: 'cents' },
};

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function belowHundred(value: number): string {
  if (value < 20) return ONES[value];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${TENS[tens]}${ones ? ` ${ONES[ones]}` : ''}`;
}

function belowThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return [
    hundreds ? `${ONES[hundreds]} hundred` : '',
    rest ? belowHundred(rest) : '',
  ].filter(Boolean).join(' ');
}

function indianWords(value: number): string {
  if (!value) return 'zero';
  const groups: readonly number[] = [
    value % 1000,
    Math.floor(value / 1000) % 100,
    Math.floor(value / 100000) % 100,
    Math.floor(value / 10000000),
  ];
  const units = ['', 'thousand', 'lakh', 'crore'];
  return groups
    .map((group, index) => (group ? `${belowThousand(group)} ${units[index]}`.trim() : ''))
    .filter(Boolean)
    .reverse()
    .join(' ');
}

function westernWords(value: number): string {
  if (!value) return 'zero';
  const units = ['', 'thousand', 'million', 'billion', 'trillion'];
  const groups: string[] = [];
  let rest = value;
  let index = 0;
  while (rest > 0 && index < units.length) {
    const group = rest % 1000;
    if (group) groups.unshift(`${belowThousand(group)}${units[index] ? ` ${units[index]}` : ''}`);
    rest = Math.floor(rest / 1000);
    index += 1;
  }
  return groups.join(' ');
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Currency amount written the way a receipt or invoice spells it out. */
export function amountInWords(amount: number, currencyCode: string): string {
  const code = (currencyCode || 'INR').toUpperCase();
  const totalMinor = Math.max(0, Math.round((Number(amount) || 0) * 100));
  const major = Math.floor(totalMinor / 100);
  const minor = totalMinor % 100;
  const names = CURRENCY_NAMES[code] ?? {
    major: code,
    majorPlural: code,
    minor: 'minor unit',
    minorPlural: 'minor units',
  };
  const words = code === 'INR' ? indianWords(major) : westernWords(major);
  const majorLabel = major === 1 ? names.major : names.majorPlural;
  const parts = [`${capitalize(words)} ${majorLabel}`];
  if (minor) {
    const minorLabel = minor === 1 ? names.minor : names.minorPlural;
    parts.push(`${belowHundred(minor)} ${minorLabel}`);
  }
  return `${parts.join(' and ')} only`;
}

export function printMoney(amount: number, currencyCode: string): string {
  const code = (currencyCode || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).format(Number(amount) || 0);
  } catch {
    return `${code} ${(Number(amount) || 0).toFixed(2)}`;
  }
}

/** Date-only values are formatted in UTC so they never shift by a day. */
export function printDateOnly(value: string | null | undefined): string {
  const raw = String(value ?? '').slice(0, 10);
  if (!raw) return '—';
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  paid: 'Paid',
  successful: 'Paid',
  partial: 'Partially paid',
  partially_paid: 'Partially paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
  overdue: 'Overdue',
  waived: 'Waived',
};

export function printStatusLabel(status: string | null | undefined): string {
  const key = String(status ?? '').trim().toLowerCase();
  return STATUS_LABELS[key] ?? (key ? capitalize(key.replaceAll('_', ' ')) : 'Paid');
}

export function printStatusTone(status: string | null | undefined): 'paid' | 'pending' | 'due' {
  const key = String(status ?? '').trim().toLowerCase();
  if (['paid', 'successful'].includes(key)) return 'paid';
  if (['overdue', 'failed', 'refunded', 'partially_refunded'].includes(key)) return 'due';
  return 'pending';
}
