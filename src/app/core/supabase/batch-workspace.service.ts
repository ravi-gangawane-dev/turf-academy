import { DataRequestError, dataErrorMessage } from './data-error';
import { inject, Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { EnrollmentRecord, EnrollmentStudent, EnrollmentPlan } from './enrollment.models';
import { BatchWrite } from './domain-services';
export interface WorkspaceBatch {
 id:string;code:string;name:string;age_group:string|null;skill_level:string|null;capacity:number;waitlist_capacity:number;
 start_date:string|null;end_date:string|null;start_time:string|null;end_time:string|null;fee_plan_id:string|null;status:string;description:string|null;
 batch_days:{day_of_week:number}[];batch_coaches:{coach_id:string;is_primary:boolean}[];
}
export interface BatchWorkspace {
 batches:WorkspaceBatch[];coaches:{id:string;full_name:string;status:string}[];
 students:EnrollmentStudent[];plans:EnrollmentPlan[];enrollments:EnrollmentRecord[];
 waiting:{id:string;batch_id:string;student_id:string;status:string;created_at:string}[];
}
export const emptyBatchWorkspace=():BatchWorkspace=>({batches:[],coaches:[],students:[],plans:[],enrollments:[],waiting:[]});
export interface WaitlistRow {
 id:string; batch_id:string; student_id:string; student_name:string; batch_name:string; created_at:string;
}
export interface WaitlistQuery {
 student:string; batch:string; date:string; batchId:string;
 sortBy:'student_name'|'batch_name'|'created_at'; sortDirection:'asc'|'desc';
}
@Injectable({providedIn:'root'})
export class BatchWorkspaceService {
 private readonly db=inject(DatabaseService);
 async waitlistPage(page:number,size:number,query:WaitlistQuery):Promise<{rows:WaitlistRow[];total:number;page:number}> {
  const {sortBy,sortDirection,...filters}=query;
  const result=await this.db.client.rpc('get_batch_waitlist_page',{
   p_page:page,p_size:size,p_filters:filters,p_sort_by:sortBy,p_sort_direction:sortDirection,
  });
  if(result.error)throw new DataRequestError('Load waiting list',result.error);
  return result.data as {rows:WaitlistRow[];total:number;page:number};
 }
 private async all<T>(table:string,columns:string):Promise<T[]> {
  const rows:T[]=[];
  for(let offset=0;;offset+=500){
   const r=await this.db.client.from(table).select(columns).order('id').range(offset,offset+499);
   if(r.error)throw new DataRequestError('Load academy data', r.error);
   const page=(r.data??[]) as unknown as T[];rows.push(...page);if(page.length<500)return rows;
  }
 }
 async load():Promise<BatchWorkspace>{
  const [batches,coaches,students,plans,enrollments,waiting]=await Promise.all([
   this.all<WorkspaceBatch>('batches','*,batch_days(day_of_week),batch_coaches(coach_id,is_primary)'),
   this.all<BatchWorkspace['coaches'][number]>('coaches','id,full_name,status'),
   this.all<EnrollmentStudent>('students','id,student_code,full_name,date_of_birth,phone,status'),
   this.all<EnrollmentPlan>('fee_plans','id,name,monthly_fee,duration_months,status'),
   this.all<EnrollmentRecord>('enrollments','id,student_id,batch_id,fee_plan_id,status,valid_from,valid_till,monthly_fee,notes'),
   this.all<BatchWorkspace['waiting'][number]>('batch_waitlist','id,batch_id,student_id,status,created_at')
  ]);return {batches,coaches,students,plans,enrollments,waiting};
 }
 async activeEnrollment(studentId:string):Promise<EnrollmentRecord|null>{
  const r=await this.db.client.from('enrollments').select('*').eq('student_id',studentId).neq('status','cancelled').maybeSingle();
  if(r.error)throw new DataRequestError('Load student enrollment',r.error);
  return r.data as EnrollmentRecord|null;
 }
 async save(batch:BatchWrite,days:number[],coaches:{coach_id:string;is_primary:boolean}[]):Promise<string>{
  const r=await this.db.client.rpc('save_batch_workspace',{p_batch:batch,p_days:days,p_coaches:coaches});
  if(r.error)throw new DataRequestError('Load academy data', r.error);return String(r.data);
 }
 async remove(id:string):Promise<void>{
  const r=await this.db.client.from('batches').delete().eq('id',id).select('id').single();
  if(r.error)throw new Error(r.error.code==='23503'?'This batch has enrollment or history records. Mark it inactive to keep those records.':dataErrorMessage(r.error));
 }
 async assign(batchId:string,coachId:string,role:string):Promise<void>{
  const r=await this.db.client.rpc('set_batch_coach',{p_batch_id:batchId,p_coach_id:coachId,p_role:role});if(r.error)throw new DataRequestError('Load academy data', r.error);
 }
 async waitlist(batchId:string,studentId:string,action:string,date:string):Promise<void>{
  const r=await this.db.client.rpc('manage_batch_waitlist',{p_batch_id:batchId,p_student_id:studentId,p_action:action,p_valid_from:date});if(r.error)throw new DataRequestError('Load academy data', r.error);
 }
}

