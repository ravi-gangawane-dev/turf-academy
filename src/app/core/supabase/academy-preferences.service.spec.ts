import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { AcademyPreferencesService } from './academy-preferences.service';
import { DatabaseService } from './database.service';

describe('AcademyPreferencesService', () => {
  it('loads authoritative settings without requiring undeployed optional columns', async () => {
    const settings = { academy_name: 'API Academy', currency_code: 'INR', timezone: 'Asia/Kolkata',
      attendance_grace_minutes: 7, fee_due_day: 5, notification_channels: ['in_app'] };
    const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: settings, error: null }) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [
      { provide: API_CONFIG, useValue: { backend: 'supabase', useMockApi: false } },
      { provide: DatabaseService, useValue: { client: { from: () => query } } },
    ] });
    const service = TestBed.inject(AcademyPreferencesService);
    await service.load();
    expect(service.value()).toEqual(settings);
    expect(query.select).toHaveBeenCalledWith('academy_name,currency_code,timezone,attendance_grace_minutes,fee_due_day,notification_channels');
  });
});
