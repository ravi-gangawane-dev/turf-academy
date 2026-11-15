import { DatePipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { isIsoDateOnly } from '../core/localisation/academy-locale';
import { AcademyPreferencesService } from '../core/supabase/academy-preferences.service';

/**
 * Drop-in replacement for Angular's `date` pipe that applies the academy
 * timezone and locale. Date-only database values (`YYYY-MM-DD`) stay in UTC so
 * they never shift a day when the academy timezone is behind the browser.
 */
@Pipe({ name: 'academyDate', pure: false })
export class AcademyDatePipe implements PipeTransform {
  private readonly preferences = inject(AcademyPreferencesService);
  private readonly pipe = new DatePipe('en-US');

  transform(
    value: Date | string | number | null | undefined,
    format = 'mediumDate',
    timezone?: string | null,
    locale?: string | null,
  ): string | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isNaN(value)) return null;
    // Angular parses `YYYY-MM-DD` as local midnight, so convert it to UTC ourselves.
    const dateOnly = isIsoDateOnly(value);
    const input = dateOnly ? new Date(`${value}T00:00:00Z`) : value;
    const zone = timezone || (dateOnly ? 'UTC' : this.preferences.timezone());
    return this.pipe.transform(input, format, zone, locale || this.preferences.locale());
  }
}
