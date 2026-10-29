import { API_CONFIG } from '../../core/config/api.config';
import { TestBed } from '@angular/core/testing';
import { CoachAttendanceOutboxService } from './coach-attendance-outbox.service';
import { CoachPortalService } from './coach-portal.service';

describe('CoachAttendanceOutboxService', () => {
  it('queues coach attendance while offline without calling Supabase', async () => {
    const portal = {
      checkIn: vi.fn(),
      checkOut: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: CoachPortalService, useValue: portal }, { provide: API_CONFIG, useValue: { allowOfflineAttendance: true } }],
    });
    const service = TestBed.inject(CoachAttendanceOutboxService);
    service.online.set(false);

    await service.queueCheckIn('student-offline', 'batch-offline');

    expect(service.operations().some((item) => item.studentId === 'student-offline')).toBe(true);
    expect(portal.checkIn).not.toHaveBeenCalled();
  });
});
