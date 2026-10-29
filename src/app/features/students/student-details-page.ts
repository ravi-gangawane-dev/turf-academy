import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
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
import { DataTable } from '../../shared/data-table/data-table';
import { PageHero } from '../../shared/page-hero/page-hero';
import { StudentDetailRecord, StudentListService, StudentWorkspace } from './student-list.service';
import { AuthService } from '../../core/auth/auth.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';

type DetailTab = 'overview' | 'documents' | 'attendance' | 'payments' | 'medical' | 'timeline';

@Component({
  selector: 'app-student-details-page',
  imports: [TableTools, ColumnFilter, SortableHeader, AsyncState, StatusBadge, AcademyMoneyPipe, DatePipe, PageHero, DataTable, SummaryMetricCard],
  templateUrl: './student-details-page.html',
  styleUrl: './student-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly students = inject(StudentListService);
  protected readonly auth = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly data = signal<StudentWorkspace | null>(null);
  protected readonly activeTab = signal<DetailTab>('overview');
  protected readonly attendancePage = signal(1);
  protected readonly paymentPage = signal(1);
  protected readonly documentPage = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  protected readonly attendanceSummary = computed(() => {
    const summary = this.data()?.attendanceSummary ?? { total: 0, present: 0, late: 0, absent: 0 };
    return {
      ...summary,
      rate: summary.total
        ? Math.round(((summary.present + summary.late) / summary.total) * 1000) / 10
        : 0,
    };
  });
  protected readonly paymentTotal = computed(() => this.data()?.paymentAmount ?? 0);
  protected readonly timeline=signal<readonly StudentDetailRecord[]>([]);
  protected readonly timelinePage=signal(1);
  protected readonly timelineTotal=signal(0);
  protected readonly tableLoading=signal(false);
  protected readonly tableError=signal('');
  protected readonly tableSort=signal('');
  protected readonly tableDirection=signal<'asc'|'desc'>('desc');
  private tableRequest=0;
  protected readonly columns=createColumnFilters(()=>void this.changeHistoryPage(this.activeTab(),1),()=>{++this.tableRequest;});
  protected sortTable(key:string){this.tableDirection.set(this.tableSort()===key&&this.tableDirection()==='asc'?'desc':'asc');this.tableSort.set(key);void this.changeHistoryPage(this.activeTab(),1);}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      await this.router.navigateByUrl('/students');
      return;
    }
    await this.load(id);
  }
  protected async retry(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) await this.load(id);
  }
  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.students.getStudentWorkspace(id));
      const recent=await this.students.detailPage(id,'timeline',1,5,{},'date','desc');
      this.timeline.set(recent.rows);this.timelineTotal.set(recent.total);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Student details could not be loaded.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  protected openBreadcrumb(label: string): void {
    void this.router.navigateByUrl(label === 'Dashboard' ? '/dashboard' : '/students');
  }
  protected edit(): void {
    const id = this.data()?.student.id;
    if (id) void this.router.navigate(['/students', id, 'edit']);
  }
  protected backToStudents(): void {
    void this.router.navigateByUrl('/students');
  }
  protected markAttendance(): void {
    void this.router.navigateByUrl('/attendance/check-in-out');
  }
  protected openPayments(): void {
    void this.router.navigateByUrl('/fees');
  }
  protected sendMessage(): void {
    const phone = this.data()?.student.parentPhone ?? this.data()?.student.phone;
    if (phone) window.open(`https://wa.me/91${phone}`, '_blank', 'noopener');
  }
  protected setTab(tab: DetailTab): void {
    ++this.tableRequest;this.activeTab.set(tab);this.columns.values.set({});this.tableSort.set('');this.tableDirection.set('desc');
    if(['attendance','payments','documents','timeline'].includes(tab))void this.changeHistoryPage(tab,1);
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected text(row: StudentDetailRecord | null, key: string): string {
    return String(row?.[key] ?? '');
  }
  protected timelineValue(row: StudentDetailRecord, key: string): string {
    const value = row[key];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }
  protected related(row: StudentDetailRecord | null, relation: string, key: string): string {
    const value = row?.[relation];
    return value && typeof value === 'object'
      ? String((value as StudentDetailRecord)[key] ?? '')
      : '';
  }
  protected fileSize(bytes: unknown): string {
    const size = Number(bytes ?? 0);
    if (!size) return '—';
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  protected amount(row: StudentDetailRecord): number {
    return Number(row['amount'] ?? 0);
  }
  protected async changeHistoryPage(kind:DetailTab,page:number):Promise<void>{
    const workspace=this.data();if(!workspace || !['attendance','payments','documents','timeline'].includes(kind))return;
    const request=++this.tableRequest;this.tableLoading.set(true);this.tableError.set('');
    const sort=this.tableSort()||({attendance:'attendance_date',payments:'paid_at',documents:'created_at',timeline:'date'} as Record<string,string>)[kind];
    try{
      const result=await this.students.detailPage(workspace.student.id,kind,page,this.pageSize(),this.columns.params(),sort,this.tableDirection());
      if(request!==this.tableRequest)return;
      if(kind==='timeline'){this.timeline.set(result.rows);this.timelineTotal.set(result.total);this.timelinePage.set(result.page);}
      else {
        if(kind==='attendance')this.attendancePage.set(result.page);
        if(kind==='payments')this.paymentPage.set(result.page);
        if(kind==='documents')this.documentPage.set(result.page);
        const totalKey={attendance:'attendanceTotal',payments:'paymentTotal',documents:'documentTotal'}[kind as 'attendance'|'payments'|'documents'];
        this.data.update(current=>current?{...current,[kind]:result.rows,[totalKey]:result.total}:current);
      }
    }catch(error){if(request===this.tableRequest)this.tableError.set(error instanceof Error?error.message:'Student history could not be loaded.');}
    finally{if(request===this.tableRequest)this.tableLoading.set(false);}
  }
  protected async changeHistoryPageSize(size:number){this.pageSize.set(size);await this.changeHistoryPage(this.activeTab(),1);}
}
