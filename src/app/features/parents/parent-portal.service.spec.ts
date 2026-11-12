import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { ParentsService } from '../../core/supabase/domain-services';
import { StorageService } from '../../core/supabase/storage.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StudentListService } from '../students/student-list.service';
import { ParentPortalService } from './parent-portal.service';

describe('ParentPortalService receipts', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(payment: unknown) {
    TestBed.resetTestingModule();
    const maybeSingle = vi.fn().mockResolvedValue({ data: payment, error: null });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    });
    const signedUrl = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SupabaseClientService,
          useValue: { requireClient: () => ({ from }) },
        },
        { provide: StorageService, useValue: { signedUrl } },
        { provide: AuthService, useValue: { profile: () => null } },
        { provide: ParentsService, useValue: { getByProfile: vi.fn() } },
        { provide: StudentListService, useValue: { getStudentWorkspace: vi.fn() } },
      ],
    });
    return { service: TestBed.inject(ParentPortalService), from, signedUrl };
  }

  it('returns the payment receipt without creating a stale stored-file URL', async () => {
    const payment = {
      id: 'pay-1',
      student_id: 's1',
      receipt: [
        { id: 'rec-1', receipt_number: 'RCP-1', storage_path: 'legacy/rec-1.pdf' },
      ],
    };
    const { service, from, signedUrl } = setup(payment);

    const result = await service.payment('pay-1', 's1');

    expect(from).toHaveBeenCalledWith('payments');
    expect(result?.receipt).toEqual(payment.receipt[0]);
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it('normalizes a single receipt object and keeps a missing receipt null', async () => {
    const receipt = { id: 'rec-1', receipt_number: 'RCP-1', storage_path: null };
    const { service } = setup({ id: 'pay-1', receipt });

    expect((await service.payment('pay-1', 's1'))?.receipt).toEqual(receipt);

    const { service: empty } = setup({ id: 'pay-2', receipt: null });
    expect((await empty.payment('pay-2', 's1'))?.receipt).toBeNull();
  });

  it('returns null when the payment is not scoped to the selected child', async () => {
    const { service } = setup(null);

    await expect(service.payment('pay-1', 's1')).resolves.toBeNull();
  });
});
