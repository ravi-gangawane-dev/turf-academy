import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BatchesPage } from './batches-page';
import { BatchWorkspaceService, emptyBatchWorkspace } from '../../core/supabase/batch-workspace.service';
import { EnrollmentsService } from '../../core/supabase/domain-services';
import { ServerListService } from '../../core/supabase/server-list.service';

function listPage(rows: unknown[] = [], options = emptyBatchWorkspace()) {
 return {
  rows, total: rows.length, page: 1,
  metrics: { batches: 0, active: 0, capacity: 0, waiting: 0 },
  options,
  totals: { count: 0, base: 0, discount: 0, late: 0, final: 0, paid: 0, balance: 0 },
 };
}

describe('Batch saves',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('keeps the form after failure and reuses its draft ID on retry',async()=>{
  const api={save:vi.fn().mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValue('saved')};
  const lists={page:vi.fn().mockResolvedValue(listPage())};
  TestBed.configureTestingModule({imports:[BatchesPage],providers:[provideRouter([]),{provide:BatchWorkspaceService,useValue:api},{provide:EnrollmentsService,useValue:{}},{provide:ServerListService,useValue:lists}]});
  const page=TestBed.createComponent(BatchesPage).componentInstance;page['edit']();page['form'].patchValue({name:'Morning batch',code:'B-1',fee_plan_id:'plan-1'});
  await page['save']();expect(page['editing']()).toBe('');expect(page['error']()).toContain('Database unavailable');expect(page['message']()).toBe('');
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

describe('Allocation filtering and pagination',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('requests the filtered batch page from the server',async()=>{
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
