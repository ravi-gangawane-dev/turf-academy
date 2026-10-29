import { TableTools } from '../../shared/data-table/table-tools';
import { ServerListService } from '../../core/supabase/server-list.service';
import { EnrollmentRecord } from '../../core/supabase/enrollment.models';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BatchWorkspaceService, emptyBatchWorkspace, WorkspaceBatch, WaitlistRow, WaitlistQuery } from '../../core/supabase/batch-workspace.service';
import { Pagination } from '../../shared/pagination/pagination';
import { EnrollmentsService } from '../../core/supabase/domain-services';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { DataTable } from '../../shared/data-table/data-table';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
@Component({selector:'app-batches-page',imports: [TableTools, StatusBadge, PageHero, AsyncState, ReactiveFormsModule,FormsModule,RouterLink,AcademyMoneyPipe,DatePipe,DataTable,SummaryMetricCard,SortableHeader,Pagination],templateUrl:'./batches-page.html',styleUrl:'./batches-page.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class BatchesPage implements OnInit, OnDestroy {
 private readonly preferences=inject(AcademyPreferencesService);
 private readonly lists=inject(ServerListService);
 private requestId=0;
 protected readonly total=signal(0);
 private readonly api=inject(BatchWorkspaceService);
 private readonly enrollments=inject(EnrollmentsService);
 private readonly fb=inject(FormBuilder);
 private readonly router=inject(Router);
 private readonly route=inject(ActivatedRoute);
 private readonly dialogs=inject(InteractionDialogService);
 protected readonly auth=inject(AuthService);
 protected readonly workspace=signal(emptyBatchWorkspace());
 protected readonly loading=signal(true);protected readonly saving=signal(false);
 protected readonly error=signal('');protected readonly message=signal('');
 protected readonly editing=signal<string|null>(null);
 protected readonly days=signal<number[]>([1,3,5]);
 protected readonly dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 protected readonly view=this.router.url.split('?')[0].split('/')[2]??'list';
 protected readonly query=signal('');protected readonly status=signal('all');
 protected readonly sortBy=signal('name');protected readonly sortDirection=signal<'asc'|'desc'>('asc');
 protected readonly coachFilter=signal(this.route.snapshot.queryParamMap.get('coach')??'');
 protected readonly batchFilter=signal(this.route.snapshot.queryParamMap.get('batch')??'');
 protected readonly page=signal(1);
 protected readonly pageSize=signal(DEFAULT_PAGE_SIZE);
 protected setPageSize(size:number):void{this.pageSize.set(size);this.filterChanged();}
 protected get today():string{return this.preferences.today();}
 private draftId='';
 protected readonly form=this.fb.nonNullable.group({
  name:['',[Validators.required,Validators.minLength(2)]],code:['',Validators.required],age_group:[''],skill_level:[''],
  capacity:[20,[Validators.required,Validators.min(1)]],waitlist_capacity:[0,[Validators.required,Validators.min(0)]],
  start_date:[this.today,Validators.required],end_date:[''],start_time:['06:00',Validators.required],end_time:['08:00',Validators.required],
  fee_plan_id:['',Validators.required],status:['active',Validators.required],description:[''],primaryCoach:['']
 });
 protected readonly assignment=this.fb.nonNullable.group({batch:['',Validators.required],coach:[this.coachFilter(),Validators.required],role:['primary',Validators.required]});
 protected readonly allocation=this.fb.nonNullable.group({student:['',Validators.required],batch:['',Validators.required],start:[this.today,Validators.required],action:['enroll',Validators.required]});
 protected readonly pageRows=signal<readonly (WorkspaceBatch & {active_count:number;waiting_count:number})[]>([]);
 protected readonly pageAllocations=signal<readonly (EnrollmentRecord & {student:{full_name:string};batch:{name:string}})[]>([]);
 protected columnFilters={student:'',batch:'',schedule:'',coach:'',capacity:'',columnStatus:'',fee:'',start:''};
 private columnTimer?:ReturnType<typeof setTimeout>;
 protected scheduleColumnFilters():void{
  clearTimeout(this.columnTimer);++this.requestId;this.page.set(1);
  this.columnTimer=setTimeout(()=>void this.load(),250);
 }
 protected resetColumnFilters():void{
  this.columnFilters={student:'',batch:'',schedule:'',coach:'',capacity:'',columnStatus:'',fee:'',start:''};
  this.query.set('');this.status.set('all');this.coachFilter.set('');this.batchFilter.set('');this.filterChanged();
 }
 protected filterChanged():void{this.page.set(1);void this.load();if(this.waitingBatchId!==this.batchFilter()){this.waitingBatchId=this.batchFilter();this.waitingPage.set(1);void this.loadWaiting();}}
 protected changeSortBy(event:Event):void{this.sortBy.set((event.target as HTMLSelectElement).value);this.filterChanged();}
 protected sortColumn(key:string):void{this.sortDirection.set(this.sortBy()===key?(this.sortDirection()==='asc'?'desc':'asc'):'asc');this.sortBy.set(key);this.filterChanged();}
 protected changeSortDirection(event:Event):void{this.sortDirection.set((event.target as HTMLSelectElement).value==='desc'?'desc':'asc');this.filterChanged();}
 protected changePage(page:number):void{this.page.set(page);void this.load();}
 protected readonly waiting=signal<WaitlistRow[]>([]);
 protected readonly waitingTotal=signal(0);
 protected readonly waitingPage=signal(1);
 protected readonly waitingPageSize=signal(DEFAULT_PAGE_SIZE);
 protected readonly waitingLoading=signal(false);
 protected readonly waitingError=signal('');
 protected waitingFilters={student:'',batch:'',date:''};
 protected waitingSort:WaitlistQuery['sortBy']='created_at';
 protected waitingDirection:WaitlistQuery['sortDirection']='asc';
 private waitingRequest=0;
 private waitingTimer?:ReturnType<typeof setTimeout>;
 private waitingPending?:Promise<void>;
 private waitingKey='';
 private waitingBatchId=this.batchFilter();
 ngOnDestroy():void{clearTimeout(this.waitingTimer);clearTimeout(this.columnTimer);++this.waitingRequest;++this.requestId;}
 protected scheduleWaitingFilters():void{
  clearTimeout(this.waitingTimer);++this.waitingRequest;this.waitingKey='';
  this.waitingPage.set(1);this.waitingLoading.set(true);this.waitingError.set('');
  this.waitingTimer=setTimeout(()=>void this.loadWaiting(),250);
 }
 protected sortWaiting(key:WaitlistQuery['sortBy']):void{
  this.waitingDirection=this.waitingSort===key&&this.waitingDirection==='asc'?'desc':'asc';
  this.waitingSort=key;this.waitingPage.set(1);void this.loadWaiting();
 }
 protected resetWaiting():void{this.waitingFilters={student:'',batch:'',date:''};this.waitingSort='created_at';this.waitingDirection='asc';this.waitingPage.set(1);void this.loadWaiting();}
 protected changeWaitingPage(page:number):void{this.waitingPage.set(page);void this.loadWaiting();}
 protected changeWaitingSize(size:number):void{this.waitingPageSize.set(size);this.waitingPage.set(1);void this.loadWaiting();}
 protected loadWaiting():Promise<void>{
  clearTimeout(this.waitingTimer);
  if(!['capacity','student-allocation'].includes(this.view))return Promise.resolve();
  const query:WaitlistQuery={student:this.waitingFilters.student.trim(),batch:this.waitingFilters.batch.trim(),date:this.waitingFilters.date,batchId:this.batchFilter(),sortBy:this.waitingSort,sortDirection:this.waitingDirection};
  const key=JSON.stringify([this.waitingPage(),this.waitingPageSize(),query]);
  if(this.waitingPending&&this.waitingKey===key)return this.waitingPending;
  this.waitingKey=key;
  const load=this.fetchWaiting(query);this.waitingPending=load;
  void load.finally(()=>{if(this.waitingPending===load)this.waitingPending=undefined;});
  return load;
 }
 private async fetchWaiting(query:WaitlistQuery):Promise<void>{
  const request=++this.waitingRequest;this.waitingLoading.set(true);this.waitingError.set('');this.waiting.set([]);
  try{const result=await this.api.waitlistPage(this.waitingPage(),this.waitingPageSize(),query);
   if(request!==this.waitingRequest)return;
   this.waiting.set(result.rows);this.waitingTotal.set(result.total);this.waitingPage.set(result.page);
  }catch(e){if(request===this.waitingRequest){this.waiting.set([]);this.waitingTotal.set(0);this.waitingError.set(this.errorText(e));}}
  finally{if(request===this.waitingRequest)this.waitingLoading.set(false);}
 }
 protected readonly metrics=signal({batches:0,active:0,capacity:0,waiting:0});
 async ngOnInit():Promise<void>{await Promise.all([this.load(),this.loadWaiting()]);}
 protected async load():Promise<void>{
  clearTimeout(this.columnTimer);
  const request=++this.requestId;this.loading.set(true);this.error.set('');
  try{
   const result=await this.lists.page<WorkspaceBatch & EnrollmentRecord & {active_count:number;waiting_count:number;student:{full_name:string};batch:{name:string}},ReturnType<typeof this.metrics>,ReturnType<typeof emptyBatchWorkspace>>(
    this.view==='student-allocation'?'allocations':'batches',this.page(),this.pageSize(),{...Object.fromEntries(Object.entries(this.columnFilters).map(([key,value])=>[key,String(value??'').trim()])),search:this.query(),status:this.status(),batchId:this.batchFilter(),coachId:this.coachFilter(),view:this.view,omitWaitlist:'true',sortBy:this.sortBy(),sortDirection:this.sortDirection()});
   if(request!==this.requestId)return;
   this.workspace.set({...emptyBatchWorkspace(),...result.options});
   this.total.set(result.total);this.page.set(result.page);this.metrics.set(result.metrics);
   this.pageRows.set(this.view==='student-allocation'?[]:result.rows);
   this.pageAllocations.set(this.view==='student-allocation'?result.rows:[]);
  }catch(e){if(request===this.requestId){this.error.set(this.errorText(e));this.pageRows.set([]);this.pageAllocations.set([]);this.total.set(0);}}
  finally{if(request===this.requestId)this.loading.set(false);}
 }
 protected activeCount(id:string):number{return this.pageRows().find(b=>b.id===id)?.active_count??0;}
 protected waitingCount(id:string):number{return this.pageRows().find(b=>b.id===id)?.waiting_count??0;}
 protected studentName(id:string):string{return this.pageAllocations().find(e=>e.student_id===id)?.student?.full_name??this.workspace().students.find(s=>s.id===id)?.full_name??'Unknown student';}
 protected batchName(id:string):string{return this.workspace().batches.find(b=>b.id===id)?.name??'Unknown batch';}
 protected coachName(id:string):string{return this.workspace().coaches.find(c=>c.id===id)?.full_name??'Unknown coach';}
 protected fee(b:WorkspaceBatch):number{return Number(this.workspace().plans.find(p=>p.id===b.fee_plan_id)?.monthly_fee??0);}
 protected schedule(b:WorkspaceBatch):string{return b.batch_days.map(d=>this.dayNames[d.day_of_week]).join(', ');}
 protected hasSessionToday(b:WorkspaceBatch):boolean{return b.status==='active'&&(!b.start_date||b.start_date<=this.today)&&(!b.end_date||b.end_date>=this.today)&&b.batch_days.some(d=>d.day_of_week===new Date(this.today+'T12:00:00Z').getUTCDay());}
 protected edit(b?:WorkspaceBatch):void{
  this.draftId=b?.id??crypto.randomUUID();this.editing.set(b?.id??'');this.error.set('');this.days.set(b?.batch_days.map(d=>d.day_of_week)??[1,3,5]);
  this.form.reset({name:b?.name??'',code:b?.code??'',age_group:b?.age_group??'',skill_level:b?.skill_level??'',capacity:b?.capacity??20,waitlist_capacity:b?.waitlist_capacity??0,start_date:b?.start_date??this.today,end_date:b?.end_date??'',start_time:b?.start_time?.slice(0,5)??'06:00',end_time:b?.end_time?.slice(0,5)??'08:00',fee_plan_id:b?.fee_plan_id??'',status:b?.status??'active',description:b?.description??'',primaryCoach:b?.batch_coaches.find(c=>c.is_primary)?.coach_id??''});
 }
 protected toggleDay(day:number):void{this.days.update(days=>days.includes(day)?days.filter(d=>d!==day):[...days,day].sort());}
 protected async save():Promise<void>{
  if(this.form.invalid||!this.days().length){this.form.markAllAsTouched();this.error.set('Complete the required fields and select training days.');return;}
  const {primaryCoach,...value}=this.form.getRawValue();
  if(value.end_time<=value.start_time||(value.end_date&&value.end_date<value.start_date)){this.error.set('End time and end date must follow their start.');return;}
  const existing=this.pageRows().find(b=>b.id===this.editing());
  const coaches=(existing?.batch_coaches??[]).filter(c=>!c.is_primary&&c.coach_id!==primaryCoach);
  if(primaryCoach)coaches.push({coach_id:primaryCoach,is_primary:true});
  await this.mutate(async()=>{await this.api.save({...value,id:this.draftId},this.days(),coaches);this.editing.set(null);},'Batch saved.');
 }
 protected async remove(b:WorkspaceBatch):Promise<void>{if(await this.dialogs.confirm('Delete '+b.name+'? Batches with enrollment history must be kept.','Delete batch','Delete'))await this.mutate(()=>this.api.remove(b.id),'Batch deleted.');}
 protected async assign():Promise<void>{if(this.assignment.invalid){this.assignment.markAllAsTouched();return;}const v=this.assignment.getRawValue();await this.mutate(()=>this.api.assign(v.batch,v.coach,v.role),'Coach assignment saved.');}
 protected async unassign(batch:string,coach:string):Promise<void>{await this.mutate(()=>this.api.assign(batch,coach,'remove'),'Coach unassigned.');}
 protected async allocate():Promise<void>{
  if(this.allocation.invalid){this.allocation.markAllAsTouched();return;}const v=this.allocation.getRawValue();
  await this.mutate(async()=>{
   if(v.action==='waitlist'){await this.api.waitlist(v.batch,v.student,'add',v.start);return;}
   const existing=await this.api.activeEnrollment(v.student);
   if(existing){if(existing.batch_id===v.batch)throw new Error('Student is already allocated to this batch.');if(existing.status==='paused')throw new Error('Reactivate the enrollment before transferring.');await this.enrollments.transfer(existing.id,v.batch,v.start,'Transferred from batch allocation');}
   else{const batch=this.workspace().batches.find(b=>b.id===v.batch);if(!batch?.fee_plan_id)throw new Error('Select a fee plan for this batch first.');await this.enrollments.create(v.student,v.batch,batch.fee_plan_id,v.start);}
  },v.action==='waitlist'?'Student added to waiting list.':'Student allocation saved.');
 }
 protected async cancelEnrollment(id:string):Promise<void>{if(await this.dialogs.confirm('Cancel this enrollment and remove the student from the batch?','Remove allocation','Remove'))await this.mutate(()=>this.enrollments.changeStatus(id,'cancelled','Removed from batch allocation'),'Enrollment cancelled.');}
 protected async waitAction(batch:string,student:string,action:string):Promise<void>{await this.mutate(()=>this.api.waitlist(batch,student,action,this.today),action==='promote'?'Student enrolled.':'Waiting list entry removed.');}
 private async mutate(action:()=>Promise<unknown>,success:string):Promise<void>{if(this.saving())return;this.saving.set(true);this.error.set('');this.message.set('');try{await action();this.message.set(success);this.waitingKey='';await Promise.all([this.load(),this.loadWaiting()]);}catch(e){this.error.set(this.errorText(e));}finally{this.saving.set(false);}}
 private errorText(e:unknown):string{return e instanceof Error?e.message:'The operation failed. Please retry.';}
}
