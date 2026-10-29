import { DataRequestError } from './data-error';
import { inject, Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
export interface ActivityEvent { id:string; action:string; table_name:string; created_at:string; actor:string; }
export interface CoachAttendanceSummary { batch_id:string; batch_name:string; present:number; late:number; absent:number; total:number; }
export interface SearchResult { id:string; label:string; detail:string; kind:'students'|'parents'|'coaches'|'batches'; }
@Injectable({providedIn:'root'})
export class StaffDetailsService {
 private readonly db=inject(DatabaseService);
 async activity(parentId:string,page:number,pageSize=20){const r=await this.db.client.rpc('get_parent_activity',{p_parent_id:parentId,p_offset:(page-1)*pageSize,p_limit:pageSize});if(r.error)throw new DataRequestError('Load academy data', r.error);return r.data as {rows:ActivityEvent[];total:number};}
 async attendance(coachId:string,from:string,to:string){const r=await this.db.client.rpc('get_coach_attendance_summary',{p_coach_id:coachId,p_from:from,p_to:to});if(r.error)throw new DataRequestError('Load academy data', r.error);return (r.data??[]) as CoachAttendanceSummary[];}
 async search(query:string){const r=await this.db.client.rpc('search_academy',{p_query:query});if(r.error)throw new DataRequestError('Load academy data', r.error);return (r.data??[]) as SearchResult[];}
}
