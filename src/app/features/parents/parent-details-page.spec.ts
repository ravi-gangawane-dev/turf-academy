import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ParentDetailRecord } from '../../core/supabase/domain-services';
import { ParentDetailsPage } from './parent-details-page';
import { ParentsService, PaymentsService, NotificationsService } from '../../core/supabase/domain-services';
import { StaffDetailsService } from '../../core/supabase/staff-details.service';
import { DatabaseService } from '../../core/supabase/database.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';

const parent: ParentDetailRecord = {
  id: 'p1',
  profile_id: null,
  full_name: 'Ravi Patil',
  relation: 'Father',
  phone: '+91 98765 43211',
  whatsapp: '+91 98765 43212',
  email: 'ravi@example.com',
  occupation: 'Engineer',
  address: { formatted: 'Kharadi, Pune' },
  communication_preferences: { channel: 'whatsapp' },
  status: 'active',
  photo_path: null,
  photo_url: null,
  created_at: '2026-01-05T00:00:00Z',
  student_parents: [
    {
      is_primary: true,
      can_pick_up: true,
      student: {
        id: 's1',
        student_code: 'TCA-STU-0001',
        full_name: 'Aarav Patil',
        date_of_birth: '2014-02-01',
        phone: null,
        status: 'active',
        photo_path: null,
      },
    },
    {
      is_primary: false,
      can_pick_up: false,
      student: {
        id: 's2',
        student_code: 'TCA-STU-0002',
        full_name: 'Diya Patil',
        date_of_birth: '2015-06-12',
        phone: null,
        status: 'active',
        photo_path: null,
      },
    },
  ],
};

function setup() {
  const activity = vi.fn().mockResolvedValue({ rows: [], total: 60 });
  const ledgerPage = vi.fn().mockResolvedValue({ rows: [], total: 60 });
  const page = vi.fn().mockResolvedValue({ rows: [], total: 60 });
  const printIdCard = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [ParentDetailsPage],
    providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'p1']]) } } },
      { provide: ParentsService, useValue: { getById: async () => structuredClone(parent) } },
      { provide: PaymentsService, useValue: { ledgerPage } },
      { provide: NotificationsService, useValue: { page } },
      { provide: StaffDetailsService, useValue: { activity } },
      { provide: DatabaseService, useValue: {} },
      { provide: PrintDocumentService, useValue: { printIdCard } },
    ],
  });
  return { fixture: TestBed.createComponent(ParentDetailsPage), activity, ledgerPage, page, printIdCard };
}

describe('Parent details shared pagination and states', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['activity', 'payments', 'notifications'])('changes page size for %s', async tab => {
    const { fixture, activity, ledgerPage, page } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance['selectTab'](tab, 2);
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('app-pagination select');
    expect(select.value).toBe('5');
    select.value = '50';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance['page']()).toBe(1);
    if (tab === 'activity') expect(activity).toHaveBeenLastCalledWith('p1', 1, 50);
    if (tab === 'payments') expect(ledgerPage).toHaveBeenLastCalledWith('list', 1, 50, ['s1', 's2']);
    if (tab === 'notifications') expect(page).toHaveBeenLastCalledWith(1, 50, undefined, undefined, 'p1');
  });
  it('does not show empty results during loading or after an error', async () => {
    const { fixture, activity } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    let reject!: (error: Error) => void;
    activity.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    const pending = fixture.componentInstance['selectTab']('activity');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading details');
    expect(fixture.nativeElement.textContent).not.toContain('No activity recorded');
    reject(new Error('Please try again.'));
    await pending;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Please try again.');
    expect(fixture.nativeElement.textContent).not.toContain('No activity recorded');
  });
});

describe('Guardian card', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function ready() {
    const context = setup();
    context.fixture.detectChanges();
    await context.fixture.whenStable();
    context.fixture.detectChanges();
    return context;
  }

  it('builds the card from linked children, contacts, pickup rights and the revocation note', async () => {
    const { fixture } = await ready();
    const card = fixture.componentInstance['idCard']();

    expect(card).toMatchObject({
      holderType: 'parent',
      holderId: 'p1',
      fullName: 'Ravi Patil',
      holderCode: 'p1',
      subtitle: 'Father',
      validityNote: 'Valid while linked to an active student · revoke if lost',
    });
    expect(card?.cardNumber).toBe('ID-PAR-P1');
    expect(card?.details).toEqual(
      expect.arrayContaining([
        { label: 'Relation', value: 'Father' },
        { label: 'Phone', value: '+91 98765 43211' },
        { label: 'WhatsApp', value: '+91 98765 43212' },
        { label: 'Email', value: 'ravi@example.com' },
        {
          label: 'Children',
          value: 'Aarav Patil (TCA-STU-0001), Diya Patil (TCA-STU-0002)',
        },
        {
          label: 'Pickup',
          value: 'Aarav Patil: authorised; Diya Patil: not authorised',
        },
        {
          label: 'Revocation',
          value: 'Report a lost card to the academy; access is revoked from Parent Details.',
        },
      ]),
    );
  });

  it('opens the custom dialog, prints to the chosen destination and closes on success', async () => {
    const { fixture, printIdCard } = await ready();
    const component = fixture.componentInstance;
    const card = component['idCard']();

    component['openIdCard']();
    fixture.detectChanges();
    expect(component['idCardOpen']()).toBe(true);
    expect(fixture.nativeElement.querySelector('.id-card-dialog')).toBeTruthy();

    await component['printIdCard']('pdf');

    expect(printIdCard).toHaveBeenCalledWith(card, 'pdf');
    expect(component['idCardOpen']()).toBe(false);
    expect(component['idCardLoading']()).toBe(false);
  });

  it('keeps the dialog open with a retry message when preparation fails', async () => {
    const { fixture, printIdCard } = await ready();
    const component = fixture.componentInstance;
    printIdCard.mockRejectedValueOnce(new Error('Academy settings unavailable'));
    component['openIdCard']();

    await component['printIdCard']('preview');

    expect(component['idCardOpen']()).toBe(true);
    expect(component['idCardError']()).toBe('Academy settings unavailable');
    expect(component['idCardLoading']()).toBe(false);
  });
});
