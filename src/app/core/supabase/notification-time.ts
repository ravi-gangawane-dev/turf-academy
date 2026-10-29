function getOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === 'literal') continue;
    map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map['year']),
    Number(map['month']) - 1,
    Number(map['day']),
    Number(map['hour']) % 24,
    Number(map['minute']),
    Number(map['second']),
  );
  return asUtc - instant;
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function zonedStartOfDay(isoDate: string, timeZone: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  let ts = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const offset = getOffsetMs(ts, timeZone);
  ts -= offset;
  const offset2 = getOffsetMs(ts, timeZone);
  if (offset2 !== offset) {
    ts += offset - offset2;
  }
  return new Date(ts);
}

export function notificationDayRange(
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): { gte?: string; lt?: string } {
  const result: { gte?: string; lt?: string } = {};
  if (from?.trim()) {
    result.gte = zonedStartOfDay(from.trim(), timeZone).toISOString();
  }
  if (to?.trim()) {
    result.lt = zonedStartOfDay(addDays(to.trim(), 1), timeZone).toISOString();
  }
  return result;
}
