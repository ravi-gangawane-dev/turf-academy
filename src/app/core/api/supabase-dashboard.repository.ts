import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DashboardSummary, RecentCheckIn } from '../models/dashboard.model';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { DashboardRepository } from './dashboard.repository';
import { AcademyPreferencesService } from '../supabase/academy-preferences.service';

interface DashboardAttendanceRow {
  readonly id: string;
  readonly check_in_at: string | null;
  readonly status: string;
  readonly student:
    { readonly full_name: string } | readonly { readonly full_name: string }[] | null;
  readonly batch: { readonly name: string } | readonly { readonly name: string }[] | null;
}

@Injectable()
export class SupabaseDashboardRepository implements DashboardRepository {
  private readonly preferences = inject(AcademyPreferencesService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly auth = inject(AuthService);
  getSummary(): Observable<DashboardSummary> {
    return from(this.load());
  }

  private async load(): Promise<DashboardSummary> {
    const db = this.supabase.requireClient();
    const role = this.auth.role();
    await this.preferences.load();
    const today = this.preferences.today();
    let batchIds: string[] = [];
    let studentIds: string[] = [];

    if (role === 'coach') {
      const { data: coach, error } = await db
        .from('coaches')
        .select('id')
        .eq('profile_id', this.auth.profile()?.id ?? '')
        .maybeSingle();
      if (error) throw error;
      if (coach) {
        const { data: links, error: linkError } = await db
          .from('batch_coaches')
          .select('batch_id')
          .eq('coach_id', coach.id);
        if (linkError) throw linkError;
        batchIds = (links ?? []).map((row) => row.batch_id);
        if (batchIds.length) {
          const { data: enrollments, error: enrollmentError } = await db
            .from('enrollments')
            .select('student_id')
            .in('batch_id', batchIds)
            .in('status', ['active', 'paused']);
          if (enrollmentError) throw enrollmentError;
          studentIds = [...new Set((enrollments ?? []).map((row) => row.student_id))];
        }
      }
    } else if (role === 'parent') {
      const { data: parent, error } = await db
        .from('parents')
        .select('id')
        .eq('profile_id', this.auth.profile()?.id ?? '')
        .maybeSingle();
      if (error) throw error;
      if (parent) {
        const { data: links, error: linkError } = await db
          .from('student_parents')
          .select('student_id')
          .eq('parent_id', parent.id);
        if (linkError) throw linkError;
        studentIds = (links ?? []).map((row) => row.student_id);
      }
    }

    let studentsQuery = db.from('students').select('id,full_name,status');
    if (role === 'coach' || role === 'parent')
      studentsQuery = studentIds.length
        ? studentsQuery.in('id', studentIds)
        : studentsQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
    const { data: students, error: studentsError } = await studentsQuery;
    if (studentsError) throw studentsError;
    studentIds = (students ?? []).map((row) => row.id);

    let attendanceQuery = db
      .from('attendance_records')
      .select(
        'id,student_id,batch_id,check_in_at,status,batch:batches(name),student:students(full_name)',
      )
      .eq('attendance_date', today);
    if ((role === 'coach' || role === 'parent') && studentIds.length)
      attendanceQuery = attendanceQuery.in('student_id', studentIds);
    if ((role === 'coach' || role === 'parent') && !studentIds.length)
      attendanceQuery = attendanceQuery.in('student_id', ['00000000-0000-0000-0000-000000000000']);
    const { data: attendance, error: attendanceError } = await attendanceQuery;
    if (attendanceError) throw attendanceError;
    const checkIns: RecentCheckIn[] = ((attendance ?? []) as unknown as DashboardAttendanceRow[])
      .slice(0, 5)
      .map((row) => {
        const student: { readonly full_name: string } | null = Array.isArray(row.student)
          ? (row.student[0] ?? null)
          : row.student;
        const batch: { readonly name: string } | null = Array.isArray(row.batch)
          ? (row.batch[0] ?? null)
          : row.batch;
        const studentName: string = student?.full_name ?? 'Student';
        return {
          id: row.id,
          studentName,
          initials: studentName
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2),
          batchName: batch?.name ?? 'Batch',
          checkedInAt: row.check_in_at
            ? new Date(row.check_in_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—',
          status: row.status === 'late' ? 'Late' : 'On time',
        };
      });

    const metrics =
      role === 'coach'
        ? [
            {
              label: 'Assigned students',
              value: String(students?.length ?? 0),
              detail: 'Your current players',
              icon: 'pi-users',
              tone: 'green' as const,
            },
            {
              label: 'Present today',
              value: String(attendance?.filter((row) => row.status !== 'absent').length ?? 0),
              detail: 'Your assigned students',
              icon: 'pi-check-circle',
              tone: 'blue' as const,
            },
            {
              label: 'Assigned batches',
              value: String(batchIds.length),
              detail: 'Your training batches',
              icon: 'pi-calendar',
              tone: 'amber' as const,
            },
            {
              label: 'Attendance records',
              value: String(attendance?.length ?? 0),
              detail: 'Recorded today',
              icon: 'pi-verified',
              tone: 'violet' as const,
            },
          ]
        : role === 'parent'
          ? [
              {
                label: 'Linked students',
                value: String(students?.length ?? 0),
                detail: 'Your children',
                icon: 'pi-users',
                tone: 'green' as const,
              },
              {
                label: 'Present today',
                value: String(attendance?.filter((row) => row.status !== 'absent').length ?? 0),
                detail: 'Attendance today',
                icon: 'pi-check-circle',
                tone: 'blue' as const,
              },
            ]
          : await this.staffMetrics();
    const analytics = role === 'admin' || role === 'receptionist' ? await db.rpc('get_dashboard_analytics') : { data: null, error: null };
    if(analytics.error)throw analytics.error;
    const trends = analytics.data as { attendance: {day:string;count:number}[]; collections:{month:string;amount:number}[]; pendingFees: DashboardSummary['pendingFees'] } | null;
    return {
      academyName: this.preferences.value().academy_name,
      businessDateLabel: new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: this.preferences.value().timezone,
      }).format(new Date()),
      metrics,
      checkIns,
      pendingFees: trends?.pendingFees ?? [],
      attendanceTrend: trends?.attendance ?? [],
      collectionTrend: trends?.collections ?? [],
    };
  }

  private async staffMetrics() {
    const db = this.supabase.requireClient();
    const tables = await Promise.all(
      ['students', 'coaches', 'batches', 'parents'].map((table) => {
        const query=db.from(table).select('*', { count: 'exact', head: true });
        return table==='students'||table==='batches'?query.eq('status','active'):query;
      }),
    );
    for (const result of tables) if (result.error) throw result.error;
    return [
      {
        label: 'Active students',
        value: String(tables[0].count ?? 0),
        detail: 'Academy students',
        icon: 'pi-users',
        tone: 'green' as const,
      },
      {
        label: 'Total coaches',
        value: String(tables[1].count ?? 0),
        detail: 'Academy coaches',
        icon: 'pi-id-card',
        tone: 'violet' as const,
      },
      {
        label: 'Active batches',
        value: String(tables[2].count ?? 0),
        detail: 'Current batches',
        icon: 'pi-calendar',
        tone: 'amber' as const,
      },
      {
        label: 'Total parents',
        value: String(tables[3].count ?? 0),
        detail: 'Parent profiles',
        icon: 'pi-heart',
        tone: 'green' as const,
      },
    ];
  }
}
