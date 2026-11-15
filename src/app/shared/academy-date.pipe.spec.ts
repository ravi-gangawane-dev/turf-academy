import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AcademyPreferencesService } from '../core/supabase/academy-preferences.service';
import { AcademyDatePipe } from './academy-date.pipe';

describe('AcademyDatePipe', () => {
  const timezone = signal('Asia/Kolkata');
  const locale = signal('en-IN');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AcademyDatePipe,
        { provide: AcademyPreferencesService, useValue: { timezone, locale } },
      ],
    });
  });

  it('formats timestamps in the academy timezone', () => {
    const pipe = TestBed.inject(AcademyDatePipe);
    expect(pipe.transform('2026-11-15T20:30:00Z', 'dd MMM yyyy, HH:mm')).toBe(
      '16 Nov 2026, 02:00',
    );
  });

  it('keeps date-only values on the same calendar day', () => {
    const pipe = TestBed.inject(AcademyDatePipe);
    timezone.set('America/Los_Angeles');
    expect(pipe.transform('2026-11-15', 'dd MMM yyyy')).toBe('15 Nov 2026');
  });

  it('follows a saved timezone change without recreating the pipe', () => {
    const pipe = TestBed.inject(AcademyDatePipe);
    timezone.set('UTC');
    expect(pipe.transform('2026-11-15T20:30:00Z', 'dd MMM yyyy, HH:mm')).toBe(
      '15 Nov 2026, 20:30',
    );
    timezone.set('Asia/Kolkata');
    expect(pipe.transform('2026-11-15T20:30:00Z', 'dd MMM yyyy, HH:mm')).toBe(
      '16 Nov 2026, 02:00',
    );
  });

  it('honours an explicit timezone and leaves empty values blank', () => {
    const pipe = TestBed.inject(AcademyDatePipe);
    expect(pipe.transform('2026-11-15T20:30:00Z', 'dd MMM yyyy', 'UTC')).toBe('15 Nov 2026');
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });
});
