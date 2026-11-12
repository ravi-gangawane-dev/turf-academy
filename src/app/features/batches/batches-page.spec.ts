import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BatchesPage } from './batches-page';
import { BatchRosterRecord, BatchWorkspaceService, emptyBatchWorkspace, WorkspaceBatch } from '../../core/supabase/batch-workspace.service';
import { BatchesService, EnrollmentsService } from '../../core/supabase/domain-services';
import { ServerListService } from '../../core/supabase/server-list.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { PrintBatchRosterDocument } from '../../shared/print/print-document.models';

function listPage(rows: unknown[] = [], options = emptyBatchWorkspace()) {
 return {
  rows, total: rows.length, page: 1,
  metrics: { batches: 0, active: 0, capacity: 0, waiting: 0 },
  totals: { count: 0, base: 0, discount: 0, late: 0, final: 0, paid: 0, balance: 0 },
  options,
 };
}

describe('Batch saves',()=> {
 afterEach(()=>TestBed.resetTestingModule());
 it('keeps the form after failure and reuses its draft ID on retry',async()=> {
  const api={save:vi.fn().mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValue('saved')};
  const lists={page:vi.fn().mockResolvedValue(listPage())};
  const toastMock = {
    show: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  };
  TestBed.configureTestingModule({imports:[BatchesPage],providers:[provideRouter([]),{provide:BatchWorkspaceService,useValue:api},{provide:EnrollmentsService,useValue:{}},{provide:ServerListService,useValue:lists},{provide:ToastService,useValue:toastMock}]});
  const page=TestBed.createComponent(BatchesPage).componentInstance;page['edit']();page['form'].patchValue({name:'Morning batch',code:'B-1',fee_plan_id:'plan-1'});
  await page['save']();expect(page['editing']()).toBe('');
  const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
  expect(toast).toHaveBeenCalledWith('Database unavailable');
  await page['save']();expect(api.save.mock.calls[0][0].id).toBe(api.save.mock.calls[1][0].id);expect(page['editing']()).toBeNull();expect(lists.page).toHaveBeenCalledTimes(1);
 });
});

describe('Batch directory', () => {
 afterEach(() => TestBed.resetTestingModule());
 it('renders missing schedules, every coach, status and an accessible edit action', async () => {
  const workspace = emptyBatchWorkspace();
  workspace.coaches = [{id:'coach-1',full_name:'First Coach',status:'active'},{id:'coach-2',full_name:'Second Coach',status:'active'}];
  workspace.batches = [{id:'batch-1',name:'Morning batch',code:'B-1',age_group:null,skill_level:null,capacity:20,waitlist_capacity:0,start_date:null,end_date:null,start_time:null,end_time:null,fee_plan_id:null,status:'active',description:null,batch_days:[],batch_coaches:[{coach_id:'coach-1',is_primary:true},{coach_id:'coach-2',is_primary:false}]}];
  const lists={page:vi.fn().mockResolvedValue(listPage([{...workspace.batches[0],active_count:0,waiting_count:0}],workspace))};
  TestBed.configureTestingModule({imports:[BatchesPage],providers:[provideRouter([]),{provide:BatchWorkspaceService,useValue:{}},{provide:EnrollmentsService,useValue:{}},{provide:ServerListService,useValue:lists}]});
  const fixture=TestBed.createComponent(BatchesPage);
  fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
  const element:HTMLElement=fixture.nativeElement;
  expect(element.querySelectorAll('.batch-directory .column-filters input')).toHaveLength(6);
  expect(element.querySelector('app-filter-bar')).toBeNull();
  const row=element.querySelector('.batch-directory tbody tr')!;
  expect(row.textContent).toContain('Not scheduled');
  expect(row.textContent).toContain('First Coach');expect(row.textContent).toContain('Second Coach');
  expect(row.querySelector('app-status-badge')?.textContent).toContain('active');
  expect(row.querySelector('td:nth-child(2) small')?.textContent?.trim()).toBe('B-1');
  (row.querySelector('[aria-label="Edit Morning batch"]') as HTMLButtonElement).click();
  expect(fixture.componentInstance['editing']()).toBe('batch-1');
 });
});

describe('Allocation filtering and pagination',()=> {
 afterEach(()=>TestBed.resetTestingModule());
 it('requests the filtered batch page from the server',async()=> {
  const lists={page:vi.fn().mockResolvedValue(listPage())};
  TestBed.configureTestingModule({imports:[BatchesPage],providers:[provideRouter([]),{provide:BatchWorkspaceService,useValue:{}},{provide:EnrollmentsService,useValue:{}},{provide:ServerListService,useValue:lists}]});
  const page=TestBed.createComponent(BatchesPage).componentInstance;
  page['status'].set('paused');
  page['columnFilters']={student:'Aarav',batch:'Morning',schedule:'Mon',coach:'Rahul',capacity:'30',columnStatus:'act',fee:'2000',start:'2026-10-14'};
  await page['load']();
  expect(lists.page).toHaveBeenCalledWith('batches',1,page['pageSize'](),expect.objectContaining({status:'paused',...page['columnFilters']}));
  expect(page['pageRows']()).toEqual([]);
 });
});

const rosterBatch: WorkspaceBatch = {
  id: 'batch-1', name: 'Morning Elite', code: 'B-MOR', age_group: 'Under 14', skill_level: 'Intermediate',
  capacity: 20, waitlist_capacity: 0, start_date: '2026-11-01', end_date: '2027-03-31',
  start_time: '06:30:00', end_time: '08:00:00', fee_plan_id: 'plan-1', status: 'active', description: null,
  batch_days: [{ day_of_week: 5 }, { day_of_week: 1 }, { day_of_week: 3 }],
  batch_coaches: [{ coach_id: 'coach-1', is_primary: true }],
};

const rosterRecord: BatchRosterRecord = {
  batch: {
    id: 'batch-1', code: 'B-MOR', name: 'Morning Elite', age_group: 'Under 14', skill_level: 'Intermediate',
    capacity: 20, start_date: '2026-11-01', end_date: '2027-03-31', start_time: '06:30:00', end_time: '08:00:00',
    status: 'active', batch_days: [{ day_of_week: 5 }, { day_of_week: 1 }, { day_of_week: 3 }],
    batch_coaches: [{ coach: { full_name: 'Coach Rao' } }],
  },
  coaches: ['Coach Rao'],
  rows: [
    {
      studentId: 's1', studentCode: 'TCA-STU-0001', studentName: 'Aarav Patil', dateOfBirth: '2014-02-01',
      status: 'active',
      guardians: [{ name: 'Ravi Patil', relation: 'Father', phone: '+91 98765 43211', whatsapp: null, isPrimary: true, canPickUp: true }],
      medical: 'Blood group B+ · Allergies: None',
    },
  ],
};

function rosterSetup(canReadMedical = true) {
  const roster = vi.fn().mockResolvedValue(structuredClone(rosterRecord));
  const printBatchRoster = vi.fn().mockResolvedValue(undefined);
  const lists = { page: vi.fn().mockResolvedValue(listPage([{ ...rosterBatch, active_count: 1, waiting_count: 0 }])) };
  const auth = { role: () => 'admin', hasPermission: vi.fn().mockReturnValue(canReadMedical) };
  TestBed.configureTestingModule({
    imports: [BatchesPage],
    providers: [
      provideRouter([]),
      { provide: BatchWorkspaceService, useValue: {} },
      { provide: EnrollmentsService, useValue: {} },
      { provide: BatchesService, useValue: { roster } },
      { provide: ServerListService, useValue: lists },
      { provide: AuthService, useValue: auth },
      { provide: PrintDocumentService, useValue: { printBatchRoster } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(BatchesPage);
  return { fixture, component: fixture.componentInstance, roster, printBatchRoster, auth };
}

function printedRoster(printBatchRoster: ReturnType<typeof vi.fn>): Omit<PrintBatchRosterDocument, 'kind' | 'brand'> {
  return printBatchRoster.mock.calls[0][0] as Omit<PrintBatchRosterDocument, 'kind' | 'brand'>;
}

describe('Batch roster', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('offers a roster action on every batch row', async () => {
    const { fixture } = rosterSetup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.componentInstance;

    expect(fixture.nativeElement.querySelector('[aria-label="Print roster for Morning Elite"]')).toBeTruthy();
    page['openRoster'](rosterBatch);
    fixture.detectChanges();
    expect(page['rosterOpen']()).toBe(true);
    expect(page['rosterBatch']()).toEqual(rosterBatch);
    expect(fixture.nativeElement.querySelector('.roster-dialog')).toBeTruthy();
  });

  it('prints guardian contacts without medical notes by default', async () => {
    const { component, roster, printBatchRoster } = rosterSetup();
    component['openRoster'](rosterBatch);

    await component['printRoster']('preview');

    expect(roster).toHaveBeenCalledWith('batch-1', false);
    const document = printedRoster(printBatchRoster);
    expect(document).toMatchObject({
      rosterNumber: 'RST-BMOR',
      batchName: 'Morning Elite',
      batchCode: 'B-MOR',
      batchStatus: 'active',
      ageGroup: 'Under 14',
      skillLevel: 'Intermediate',
      schedule: 'Mon, Wed, Fri',
      batchTime: '06:30 – 08:00',
      batchDates: '2026-11-01 – 2027-03-31',
      coaches: ['Coach Rao'],
      capacity: 20,
      enrolled: 1,
      includeMedical: false,
    });
    expect(document.rows[0]).toMatchObject({
      studentId: 's1',
      studentCode: 'TCA-STU-0001',
      studentName: 'Aarav Patil',
      dateOfBirth: '2014-02-01',
      guardians: [{ name: 'Ravi Patil', relation: 'Father', canPickUp: true }],
      medical: undefined,
    });
    expect(printBatchRoster).toHaveBeenCalledWith(document, 'preview');
    expect(component['rosterOpen']()).toBe(false);
  });

  it('includes medical notes only when the viewer may read student records', async () => {
    const { component, roster, printBatchRoster } = rosterSetup(true);
    component['openRoster'](rosterBatch);
    component['rosterIncludeMedical'].set(true);

    await component['printRoster']('pdf');

    expect(roster).toHaveBeenCalledWith('batch-1', true);
    const document = printedRoster(printBatchRoster);
    expect(document.includeMedical).toBe(true);
    expect(document.rows[0].medical).toBe('Blood group B+ · Allergies: None');
    expect(printBatchRoster).toHaveBeenCalledWith(document, 'pdf');
  });

  it('never requests medical notes for a role without students:read', async () => {
    const { component, roster, printBatchRoster } = rosterSetup(false);
    component['openRoster'](rosterBatch);
    component['rosterIncludeMedical'].set(true);

    await component['printRoster']('print');

    expect(roster).toHaveBeenCalledWith('batch-1', false);
    const document = printedRoster(printBatchRoster);
    expect(document.includeMedical).toBe(false);
    expect(document.rows[0].medical).toBeUndefined();
  });

  it('disables the medical option and explains the restriction without students:read', () => {
    const { component, fixture } = rosterSetup(false);
    fixture.detectChanges();
    component['openRoster'](rosterBatch);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.roster-medical-toggle input') as HTMLInputElement;

    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Your role cannot read student medical records',
    );
  });

  it('keeps the dialog open with the live error when the roster cannot be loaded', async () => {
    const { component, roster, printBatchRoster } = rosterSetup();
    roster.mockRejectedValueOnce(new Error('Roster unavailable'));
    component['openRoster'](rosterBatch);

    await component['printRoster']();

    expect(component['rosterError']()).toBe('Roster unavailable');
    expect(component['rosterOpen']()).toBe(true);
    expect(component['rosterLoading']()).toBe(false);
    expect(printBatchRoster).not.toHaveBeenCalled();
  });
});