import { attendanceTimestamp } from './attendance-timestamp';
describe('Mock attendance timestamp normalization', () => {
  it('handles noon, midnight, 24-hour times and existing timestamps', () => {
    expect(attendanceTimestamp('2026-10-15', '3:04 pm')).toBe('2026-10-15T15:04:00');
    expect(attendanceTimestamp('2026-10-15', '12:00 am')).toBe('2026-10-15T00:00:00');
    expect(attendanceTimestamp('2026-10-15', '12:00 pm')).toBe('2026-10-15T12:00:00');
    expect(attendanceTimestamp('2026-10-15', '15:04')).toBe('2026-10-15T15:04:00');
    expect(attendanceTimestamp('2026-10-15', '2026-10-15T09:34:00Z')).toBe('2026-10-15T09:34:00Z');
    expect(attendanceTimestamp('2026-10-15', 'invalid')).toBeNull();
    expect(attendanceTimestamp('2026-10-15', null)).toBeNull();
  });
});
