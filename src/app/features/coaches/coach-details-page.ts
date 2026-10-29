import { TableTools } from '../../shared/data-table/table-tools';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachDetailRecord, CoachesService } from '../../core/supabase/domain-services';
import { PageHero } from '../../shared/page-hero/page-hero';
import { FormsModule } from '@angular/forms';
import { CoachAttendanceSummary, StaffDetailsService } from '../../core/supabase/staff-details.service';
@Component({
  selector: 'app-coach-details-page',
  imports: [TableTools, AsyncState, StatusBadge, PageHero, FormsModule],
  templateUrl: './coach-details-page.html',
  styleUrl: './coach-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachDetailsPage implements OnInit {
  private readonly details = inject(StaffDetailsService);
  protected readonly tab = signal('overview');
  protected readonly summaryLoading = signal(false);
  protected readonly attendance = signal<CoachAttendanceSummary[]>([]);
  private attendanceRequest = 0;
  protected from = new Date().toLocaleDateString('en-CA').slice(0,7)+'-01';
  protected to = new Date().toLocaleDateString('en-CA');
  protected batches(view:string):void{void this.router.navigate(['/batches',view],{queryParams:{coach:this.id}});}
  protected async showAttendance():Promise<void>{
    const request = ++this.attendanceRequest;
    const from = this.from, to = this.to;
    this.tab.set('attendance');this.error.set('');
    this.attendance.set([]);
    if(!from||!to||to<from){this.summaryLoading.set(false);this.error.set('Enter a valid date range.');return;}
    this.summaryLoading.set(true);
    try {
      const rows = await this.details.attendance(this.id, from, to);
      if (request === this.attendanceRequest) this.attendance.set(rows);
    } catch (e) {
      if (request === this.attendanceRequest) this.error.set(e instanceof Error ? e.message : 'Attendance could not be loaded.');
    } finally {
      if (request === this.attendanceRequest) this.summaryLoading.set(false);
    }
  }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coaches = inject(CoachesService);
  private id = '';
  protected readonly coach = signal<CoachDetailRecord | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly success = signal(history.state?.success ?? '');
  async ngOnInit(): Promise<void> {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) {
      this.error.set('Coach ID is missing.');
      this.loading.set(false);
      return;
    }
    try {
      this.coach.set(await this.coaches.getById(this.id));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Coach could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected specs(item: CoachDetailRecord): string {
    return item.coach_specializations.map((row) => row.specialization).join(', ') || 'Not provided';
  }
  protected edit(): void {
    void this.router.navigate(['/coaches', this.id, 'edit']);
  }
  protected list(): void {
    void this.router.navigateByUrl('/coaches');
  }
  protected breadcrumb(label: string): void {
    if (label === 'Dashboard') void this.router.navigateByUrl('/dashboard');
    if (label === 'Coaches') this.list();
  }
}
