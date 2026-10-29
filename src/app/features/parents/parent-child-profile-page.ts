import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  StudentDetailRecord,
  StudentListService,
  StudentWorkspace,
} from '../students/student-list.service';

type ChildTab = 'overview' | 'attendance' | 'fees' | 'documents' | 'medical';

@Component({
  selector: 'app-parent-child-profile-page',
  imports: [TableTools, PageHero, AsyncState, StatusBadge, AcademyMoneyPipe, DatePipe],
  templateUrl: './parent-child-profile-page.html',
  styleUrl: './parent-child-profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly students = inject(StudentListService);
  protected readonly data = signal<StudentWorkspace | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly tab = signal<ChildTab>('overview');
  protected readonly attendance = computed(() => {
    const rows = this.data()?.attendance ?? [];
    const present = rows.filter((row) =>
      ['present', 'late', 'checked_out'].includes(this.text(row, 'status')),
    ).length;
    return {
      total: rows.length,
      present,
      absent: rows.length - present,
      rate: rows.length ? Math.round((present / rows.length) * 100) : 0,
    };
  });
  protected readonly totalPaid = computed(() => this.data()?.paymentAmount ?? 0);
  protected readonly completion = computed(() => {
    const student = this.data()?.student;
    if (!student) return { completed: 0, total: 12, percentage: 0 };
    const values = [
      student.fullName,
      student.dateOfBirth,
      student.gender,
      student.bloodGroup,
      student.phone,
      student.email,
      student.address,
      student.city,
      student.state,
      student.pinCode,
      student.nationality,
      student.photoUrl,
    ];
    const completed = values.filter((value) => String(value ?? '').trim()).length;
    return {
      completed,
      total: values.length,
      percentage: Math.round((completed / values.length) * 100),
    };
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }
  protected async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigateByUrl('/parent/dashboard');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.students.getStudentWorkspace(id));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Child profile could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  protected setTab(value: ChildTab): void {
    this.tab.set(value);
  }
  protected back(): void {
    void this.router.navigateByUrl('/parent/dashboard');
  }
  protected edit(): void {
    const id = this.data()?.student.id;
    if (id) void this.router.navigate(['/parent/children', id, 'edit']);
  }
  protected message(): void {
    const phone = this.data()?.student.parentPhone;
    if (phone) window.open(`https://wa.me/91${phone}`, '_blank', 'noopener');
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected age(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) years--;
    return Math.max(0, years);
  }
  protected text(row: StudentDetailRecord | null, key: string): string {
    return String(row?.[key] ?? '');
  }
  protected related(row: StudentDetailRecord | null, relation: string, key: string): string {
    const value = row?.[relation];
    return value && typeof value === 'object'
      ? String((value as StudentDetailRecord)[key] ?? '')
      : '';
  }
  protected money(value: unknown): number {
    return Number(value ?? 0);
  }
}
