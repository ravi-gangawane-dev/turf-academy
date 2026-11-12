import { computed, inject, Injectable, signal } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { DataRequestError } from './data-error';
import { DatabaseService } from './database.service';

export interface AcademyPreferences {
  academy_name: string;
  academy_code: string;
  academy_logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  currency_code: string;
  timezone: string;
  attendance_grace_minutes: number;
  fee_due_day: number;
  notification_channels: readonly string[];
}

/** Bundled artwork is only a fallback; Settings owns the real academy logo. */
export const FALLBACK_ACADEMY_LOGO = '/branding/turf-cricket-academy-logo.png';

@Injectable({ providedIn: 'root' })
export class AcademyPreferencesService {
  private readonly db = inject(DatabaseService);
  private readonly config = inject(API_CONFIG);

  readonly value = signal<AcademyPreferences>({
    academy_name: 'Turf Cricket Academy',
    academy_code: '',
    academy_logo_url: null,
    contact_email: null,
    contact_phone: null,
    address: null,
    currency_code: 'INR',
    timezone: 'Asia/Kolkata',
    attendance_grace_minutes: 10,
    fee_due_day: 10,
    notification_channels: ['in_app'] as readonly string[],
  });

  readonly currency = computed(() => this.value().currency_code);
  readonly logoUrl = computed(
    () => String(this.value().academy_logo_url ?? '').trim() || FALLBACK_ACADEMY_LOGO,
  );

  private pending?: Promise<void>;

  load(): Promise<void> {
    if (this.config.useMockApi) return Promise.resolve();
    return this.pending ??= (async () => {
      const r = await this.db.client.from('academy_settings')
        // academy_code is optional in older deployed schemas; keep preferences
        // readable until the contract migration is applied remotely.
        .select('academy_name,contact_email,contact_phone,address,currency_code,timezone,attendance_grace_minutes,fee_due_day,notification_channels')
        .eq('id', true)
        .single();
      if (r.error) {
        this.pending = undefined;
        throw new DataRequestError('Load academy data', r.error);
      }
      this.value.set({ academy_code: 'TCM', academy_logo_url: null, ...(r.data as Omit<AcademyPreferences, 'academy_code' | 'academy_logo_url'>) });
    })();
  }

  today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.value().timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  money(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: this.currency()
    }).format(amount);
  }
}
