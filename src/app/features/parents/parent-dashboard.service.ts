import { inject, Injectable } from '@angular/core';
import { ParentDetailRecord, ParentsService } from '../../core/supabase/domain-services';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';

import { StudentDetailRecord, StudentListService, StudentWorkspace } from '../students/student-list.service';

export interface ChildWorkspace {
  readonly link: ParentDetailRecord['student_parents'][number];
  readonly workspace: StudentWorkspace;
  readonly balances: readonly StudentDetailRecord[];
  readonly sessions: readonly StudentDetailRecord[];
}

export interface ParentDashboardData {
  readonly parent: ParentDetailRecord;
  readonly children: readonly ChildWorkspace[];
}

/**
 * Reads the parent dashboard: the parent record, plus each linked child with
 * their outstanding balances and next session. Kept out of the page so the
 * queries are not rebuilt inside a component.
 */
@Injectable({ providedIn: 'root' })
export class ParentDashboardService {
  private readonly parents = inject(ParentsService);
  private readonly students = inject(StudentListService);
  private readonly supabase = inject(SupabaseClientService);

  async load(profileId: string): Promise<ParentDashboardData> {
    const parent = await this.parents.getByProfile(profileId);
    const client = this.supabase.requireClient();
    const today = new Date().toISOString().slice(0, 10);

    const children = await Promise.all(
      parent.student_parents.map(async (link): Promise<ChildWorkspace> => {
        const workspace = await this.students.getStudentWorkspace(link.student.id);
        const batchId = String(workspace.enrollment?.['batch_id'] ?? '');
        const [balances, sessions] = await Promise.all([
          client
            .from('monthly_charge_balances')
            .select('*')
            .eq('student_id', link.student.id)
            .order('charge_month', { ascending: false }),
          batchId
            ? client
              .from('training_sessions')
              .select('*')
              .eq('batch_id', batchId)
              .gte('session_date', today)
              .in('status', ['upcoming', 'rescheduled'])
              .order('session_date')
              .order('start_time')
              .limit(1)
            : Promise.resolve({ data: [], error: null }),
        ]);
        const childError = balances.error ?? sessions.error;
        if (childError) throw new Error(childError.message);
        return { link, workspace, balances: balances.data ?? [], sessions: sessions.data ?? [] };
      }),
    );

    return { parent, children };
  }
}
