import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ParentsService, StudentsService } from '../../core/supabase/domain-services';
import { ParentFormPage } from './parent-form-page';

describe('ParentFormPage', () => {
  it('preserves server consent flags when saving an edited parent', async () => {
    const parent = {
      id: 'p1', full_name: 'Test Parent', phone: '9876543210', whatsapp: '9876543210',
      relation: 'Father', status: 'inactive',
      address: { formatted: 'Test address', city: 'Pune', state: 'Maharashtra', pinCode: '411001' },
      communication_preferences: { channel: 'Email', whatsapp: false, email: true },
    };
    const parents = { getById: vi.fn().mockResolvedValue(parent), update: vi.fn().mockResolvedValue(parent) };
    TestBed.configureTestingModule({ imports: [ParentFormPage], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } } },
      { provide: ParentsService, useValue: parents },
      { provide: StudentsService, useValue: { list: vi.fn().mockResolvedValue({ data: [] }) } },
    ] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const page = TestBed.createComponent(ParentFormPage).componentInstance;
    await page.ngOnInit();
    await page['save']();
    expect(parents.update).toHaveBeenCalledWith('p1', expect.objectContaining({
      status: 'inactive',
      communication_preferences: { channel: 'Email', whatsapp: false, email: true },
    }), null);
  });
});
