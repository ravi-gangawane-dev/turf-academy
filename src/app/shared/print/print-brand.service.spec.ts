import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AcademyPreferences,
  AcademyPreferencesService,
  FALLBACK_ACADEMY_LOGO,
} from '../../core/supabase/academy-preferences.service';
import { AcademySettingsService } from '../../core/supabase/domain-services';
import { PrintBrandService } from './print-brand.service';

const fallbackPreferences = (): AcademyPreferences => ({
  academy_name: 'Fallback Academy',
  academy_code: 'FB',
  academy_logo_url: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  currency_code: 'INR',
  timezone: 'Asia/Kolkata',
  attendance_grace_minutes: 10,
  fee_due_day: 10,
  notification_channels: [],
});

describe('PrintBrandService', () => {
  afterEach(() => TestBed.resetTestingModule());

  const setup = (get: () => Promise<unknown>) => {
    TestBed.configureTestingModule({
      providers: [
        PrintBrandService,
        { provide: AcademySettingsService, useValue: { get } },
        {
          provide: AcademyPreferencesService,
          useValue: { value: signal(fallbackPreferences()) },
        },
      ],
    });
    return TestBed.inject(PrintBrandService);
  };

  it('uses Academy Settings as the authoritative brand', async () => {
    const service = setup(async () => ({
      academy_name: 'Turf Cricket Academy',
      academy_code: 'TCA',
      academy_logo_url: 'https://cdn.example/logo.png',
      address: 'Sector 21, Kharadi',
      contact_phone: '+91 98765 43210',
      contact_email: 'accounts@example.com',
      currency_code: 'INR',
      timezone: 'Asia/Kolkata',
    }));

    await expect(service.load()).resolves.toEqual({
      name: 'Turf Cricket Academy',
      code: 'TCA',
      logoUrl: 'https://cdn.example/logo.png',
      address: 'Sector 21, Kharadi',
      phone: '+91 98765 43210',
      email: 'accounts@example.com',
      currencyCode: 'INR',
      timezone: 'Asia/Kolkata',
    });
  });

  it('falls back to cached preferences and bundled artwork when settings fail', async () => {
    const service = setup(async () => {
      throw new Error('Settings unavailable');
    });

    const brand = await service.load();
    expect(brand.name).toBe('Fallback Academy');
    expect(brand.code).toBe('FB');
    expect(brand.logoUrl).toBe(FALLBACK_ACADEMY_LOGO);
    expect(brand.timezone).toBe('Asia/Kolkata');
  });

  it('caches the resolved brand until it is invalidated', async () => {
    const get = vi.fn(async () => ({
      academy_name: 'Turf Cricket Academy',
      academy_code: 'TCA',
      academy_logo_url: '',
      currency_code: 'INR',
      timezone: 'Asia/Kolkata',
    }));
    const service = setup(get);

    await service.load();
    await service.load();
    expect(get).toHaveBeenCalledOnce();

    service.invalidate();
    await service.load();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
