import { inject, Injectable } from '@angular/core';
import { AcademySettingsRecord, AcademySettingsService } from '../../core/supabase/domain-services';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { PrintBrand } from './print-document.models';

/** Bundled artwork is only used when the academy has not uploaded its own logo. */
export const FALLBACK_PRINT_LOGO = '/branding/turf-cricket-academy-logo.png';

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

@Injectable({ providedIn: 'root' })
export class PrintBrandService {
  private readonly settings = inject(AcademySettingsService);
  private readonly preferences = inject(AcademyPreferencesService);
  private cached?: PrintBrand;

  /** Academy Settings is authoritative; cached preferences keep printing usable while it loads. */
  async load(force = false): Promise<PrintBrand> {
    if (this.cached && !force) return this.cached;
    let record: Partial<AcademySettingsRecord> | null;
    try {
      record = await this.settings.get();
    } catch {
      record = null;
    }
    const fallback = this.preferences.value();
    const brand: PrintBrand = {
      name: clean(record?.academy_name) || clean(fallback.academy_name) || 'Academy',
      code: clean(record?.academy_code) || clean(fallback.academy_code),
      logoUrl: clean(record?.academy_logo_url) || FALLBACK_PRINT_LOGO,
      address: clean(record?.address),
      phone: clean(record?.contact_phone),
      email: clean(record?.contact_email),
      currencyCode: clean(record?.currency_code) || clean(fallback.currency_code) || 'INR',
      timezone: clean(record?.timezone) || clean(fallback.timezone) || 'Asia/Kolkata',
    };
    this.cached = brand;
    return brand;
  }

  invalidate(): void {
    this.cached = undefined;
  }
}
