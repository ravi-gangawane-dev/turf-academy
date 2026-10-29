/** Convert the mock store's display time to a date value accepted by DatePipe. */
export function attendanceTimestamp(date: string, time?: string | null): string | null {
  if (!time) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(time)) return time;
  const match = /^(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?$/i.exec(time.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toLowerCase() === 'p' ? 12 : 0);
  return `${date}T${String(hour).padStart(2, '0')}:${match[2]}:00`;
}
