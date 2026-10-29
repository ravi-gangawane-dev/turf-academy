import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BatchesPage } from './batches-page';
import { BatchWorkspaceService } from '../../core/supabase/batch-workspace.service';
import { ServerListService } from '../../core/supabase/server-list.service';
import { EnrollmentsService } from '../../core/supabase/domain-services';

describe('Batch waitlist', () => {
 afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });
 function setup(view='capacity') {
  const api={waitlistPage:vi.fn().mockResolvedValue({rows:[{id:'w1',student_id:'s1',batch_id:'b1',student_name:'Student One',batch_name:'Morning',created_at:'2026-10-14T00:00:00Z'}],total:12,page:1}),waitlist:vi.fn().mockResolvedValue(null)};
  const lists={page:vi.fn().mockResolvedValue({rows:[],total:0,page:1,options:{},metrics:{batches:0,active:0,capacity:0,waiting:12}})};
  TestBed.configureTestingModule({imports:[BatchesPage],providers:[provideRouter([]),{provide:BatchWorkspaceService,useValue:api},{provide:ServerListService,useValue:lists},{provide:EnrollmentsService,useValue:{}}]});
  vi.spyOn(TestBed.inject(Router),'url','get').mockReturnValue('/batches/'+view);
  const fixture=TestBed.createComponent(BatchesPage);
  return {fixture,state:fixture.componentInstance as any,api,lists};
 }
 it.each(['capacity','student-allocation'])('renders column controls and independent pagination in %s',async(view)=>{
  const {fixture,state,api,lists}=setup(view);
  fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
  const table:HTMLElement=fixture.nativeElement.querySelector('.waiting-directory');
  expect(table.querySelectorAll('app-sortable-header')).toHaveLength(3);
  expect(table.querySelectorAll('.column-filters input')).toHaveLength(3);
  if(view==='student-allocation')expect(fixture.nativeElement.querySelectorAll('.allocation-directory .column-filters input')).toHaveLength(4);
  expect(table.querySelector('input[type=date]')).not.toBeNull();
  expect(table.textContent).toContain('Student One');expect(table.textContent).toContain('Morning');
  expect(state.waitingTotal()).toBe(12);expect(api.waitlistPage).toHaveBeenCalledTimes(1);
  expect(lists.page.mock.calls[0][3]).toMatchObject({omitWaitlist:'true'});
  expect(fixture.nativeElement.querySelector('.waiting-card app-pagination').textContent).toContain('12');
 });
 it('combines column filters/sort, resets pages, debounces and avoids duplicate requests',async()=>{
  const {fixture,state,api,lists}=setup();
  fixture.detectChanges();await fixture.whenStable();
  api.waitlistPage.mockClear();lists.page.mockClear();vi.useFakeTimers();
  state.waitingPage.set(3);state.waitingFilters={student:' Student ',batch:' Morning ',date:'2026-10-14'};
  state.scheduleWaitingFilters();state.scheduleWaitingFilters();
  await vi.advanceTimersByTimeAsync(250);
  expect(api.waitlistPage).toHaveBeenCalledTimes(1);
  expect(api.waitlistPage).toHaveBeenLastCalledWith(1,5,expect.objectContaining({student:'Student',batch:'Morning',date:'2026-10-14'}));
  state.sortWaiting('student_name');await state.loadWaiting();
  expect(api.waitlistPage).toHaveBeenCalledTimes(2);
  expect(api.waitlistPage.mock.calls.at(-1)?.[2]).toMatchObject({sortBy:'student_name',sortDirection:'asc'});
  state.changeWaitingSize(20);await state.loadWaiting();
  expect(api.waitlistPage.mock.calls.at(-1)?.slice(0,2)).toEqual([1,20]);
  state.resetWaiting();await state.loadWaiting();
  expect(api.waitlistPage.mock.calls.at(-1)?.[2]).toMatchObject({student:'',batch:'',date:'',sortBy:'created_at'});
  expect(lists.page).not.toHaveBeenCalled();
 });
 it('ignores stale results and supports backend page correction, errors and retry',async()=>{
  const {state,api}=setup();let resolve!:(value:unknown)=>void;
  api.waitlistPage.mockReturnValueOnce(new Promise(r=>resolve=r));
  const old=state.loadWaiting();state.waitingFilters.student='new';state.scheduleWaitingFilters();
  await state.loadWaiting();resolve({rows:[],total:999,page:10});await old;
  expect(state.waitingTotal()).toBe(12);
  api.waitlistPage.mockResolvedValueOnce({rows:[],total:0,page:1});state.waitingPage.set(5);await state.loadWaiting();
  expect(state.waitingPage()).toBe(1);expect(state.waiting()).toEqual([]);
  api.waitlistPage.mockRejectedValueOnce(new Error('Network unavailable'));await state.loadWaiting();
  expect(state.waitingError()).toBe('Network unavailable');expect(state.waitingTotal()).toBe(0);expect(state.waitingLoading()).toBe(false);
  await state.loadWaiting();expect(state.waitingError()).toBe('');expect(state.waitingTotal()).toBe(12);
 });
 it('refreshes rows and capacity totals after removal',async()=>{
  const {state,api,lists}=setup();await state.waitAction('b1','s1','remove');
  expect(api.waitlist).toHaveBeenCalledWith('b1','s1','remove',expect.any(String));
  expect(api.waitlistPage).toHaveBeenCalledTimes(1);expect(lists.page).toHaveBeenCalledTimes(1);
 });
});
