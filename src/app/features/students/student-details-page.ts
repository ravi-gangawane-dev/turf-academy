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
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { printDateOnly, printProfileReference } from '../../shared/print/print-format';
import { idCardNumber } from '../../shared/print/id-card-qr';
import {
  PrintDestination,
  PrintIdCardInput,
  PrintProfileChecklistItem,
  PrintProfileSheetInput,
} from '../../shared/print/print-document.models';
import { PrintIdCardDialog } from '../../shared/print/print-id-card-dialog/print-id-card-dialog';
import { ToastService } from '../../shared/toast/toast.service';

type DetailTab = 'overview' | 'documents' | 'attendance' | 'payments' | 'medical' | 'timeline';

@Component({
  selector: 'app-student-details-page',
  imports: [TableTools, ColumnFilter, SortableHeader, AsyncState, StatusBadge, AcademyMoneyPipe, DatePipe, PageHero, DataTable, SummaryMetricCard, PrintIdCardDialog],
  templateUrl: './student-details-page.html',
  styleUrl: './student-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly students = inject(StudentListService);
  private readonly printDocuments = inject(PrintDocumentService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly data = signal<StudentWorkspace | null>(null);
  protected readonly activeTab = signal<DetailTab>('overview');
  protected readonly attendancePage = signal(1);
  protected readonly paymentPage = signal(1);
  protected readonly documentPage = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly idCardOpen = signal(false);
  protected readonly idCardLoading = signal(false);
  protected readonly idCardError = signal('');
  protected readonly profileLoading = signal(false);
  private readonly idCardDestination = signal<PrintDestination>('preview');

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
  protected readonly idCard = computed<PrintIdCardInput | null>(() => {
    const workspace = this.data();
    if (!workspace) return null;
    const student = workspace.student;
    const batch = this.batchOf(workspace.enrollment);
    const batchName = this.text(batch, 'name');
    const batchCode = this.text(batch, 'code');
    const guardian =
      [student.parentName, student.parentRelation ? `(${student.parentRelation})` : '']
        .filter(Boolean)
        .join(' ') || '—';
    return {
      issuedAt: new Date().toISOString(),
      cardNumber: idCardNumber('student', student.studentCode || student.id),
      holderType: 'student',
      holderId: student.id,
      fullName: student.fullName,
      holderCode: student.studentCode || student.id,
      subtitle: [batchName, batchCode].filter(Boolean).join(' · ') || 'No active batch',
      photoUrl: student.photoUrl,
      details: [
        { label: 'Date of birth', value: printDateOnly(student.dateOfBirth) },
        { label: 'Blood group', value: student.bloodGroup || '—' },
        { label: 'Guardian', value: guardian },
        { label: 'Guardian phone', value: student.parentPhone || '—' },
        { label: 'Batch', value: batchName || 'Not assigned' },
        { label: 'Joined', value: printDateOnly(student.joinedOn) },
      ],
      validityNote: 'Valid while actively enrolled',
    };
  });
  protected openIdCard(): void {
    if (!this.data()) return;
    this.idCardError.set('');
    this.idCardDestination.set('preview');
    this.idCardOpen.set(true);
  }
  protected closeIdCard(): void {
    if (this.idCardLoading()) return;
    this.idCardOpen.set(false);
  }
  protected retryIdCard(): void {
    void this.printIdCard(this.idCardDestination());
  }
  protected async printIdCard(destination: PrintDestination): Promise<void> {
    if (this.idCardLoading()) return;
    const card = this.idCard();
    if (!card) return;
    this.idCardDestination.set(destination);
    this.idCardLoading.set(true);
    this.idCardError.set('');
    try {
      await this.printDocuments.printIdCard(card, destination);
      this.idCardOpen.set(false);
    } catch (error) {
      this.idCardError.set(
        error instanceof Error ? error.message : 'The ID card could not be prepared.',
      );
    } finally {
      this.idCardLoading.set(false);
    }
  }
  private batchOf(enrollment: StudentDetailRecord | null): StudentDetailRecord | null {
    const batch = enrollment?.['batch'];
    return batch && typeof batch === 'object' ? (batch as StudentDetailRecord) : null;
  }
  protected async printProfileSheet(): Promise<void> {
    if (this.profileLoading()) return;
    const workspace = this.data();
    if (!workspace) return;
    this.profileLoading.set(true);
    let handedToPrinter = false;
    try {
      const documents = await this.students.getDocumentPage(workspace.student.id, 1, 200);
      const sheet = this.buildProfileSheet(workspace, documents.rows, documents.total);
      handedToPrinter = true;
      await this.printDocuments.printProfileSheet(sheet, 'preview');
    } catch (error) {
      if (!handedToPrinter) {
        this.toast.error(
          error instanceof Error ? error.message : 'The profile sheet could not be prepared.',
        );
      }
    } finally {
      this.profileLoading.set(false);
    }
  }
  private buildProfileSheet(
    workspace: StudentWorkspace,
    documents: readonly StudentDetailRecord[],
    documentTotal: number,
  ): PrintProfileSheetInput {
    const student = workspace.student;
    const enrollment = workspace.enrollment;
    const batch = this.batchOf(enrollment);
    const batchName = this.text(batch, 'name');
    const batchCode = this.text(batch, 'code');
    const summary = this.attendanceSummary();
    const medical = workspace.medical;
    const address =
      [student.address, student.city, student.state, student.pinCode]
        .filter(Boolean)
        .join(', ') || 'Not recorded';
    const guardian =
      [
        student.parentName,
        student.parentRelation ? `(${student.parentRelation})` : '',
        student.parentPhone ? `· ${student.parentPhone}` : '',
      ]
        .filter(Boolean)
        .join(' ') || 'Not recorded';

    const groups = new Map<string, { count: number; latest: string }>();
    for (const row of documents) {
      const type = this.text(row, 'document_type') || 'Document';
      const created = this.text(row, 'created_at');
      const entry = groups.get(type) ?? { count: 0, latest: '' };
      entry.count += 1;
      if (created > entry.latest) entry.latest = created;
      groups.set(type, entry);
    }

    const checklist: PrintProfileChecklistItem[] = [
      {
        label: 'Profile photograph',
        recorded: Boolean(student.photoUrl),
        detail: student.photoUrl ? 'Photo on file' : 'No photo uploaded',
      },
      {
        label: 'Date of birth record',
        recorded: Boolean(student.dateOfBirth),
        detail: student.dateOfBirth ? printDateOnly(student.dateOfBirth) : 'Not recorded',
      },
      {
        label: 'Guardian contact',
        recorded: Boolean(student.parentName && student.parentPhone),
        detail: guardian,
      },
      {
        label: 'Medical record',
        recorded: Boolean(medical),
        detail: medical ? 'Medical details recorded' : 'No medical record',
      },
      {
        label: 'Enrollment record',
        recorded: Boolean(enrollment),
        detail: enrollment
          ? `${this.text(enrollment, 'status') || 'active'} · ${batchName || 'No batch'}`
          : 'No enrollment recorded',
      },
      {
        label: 'Uploaded documents',
        recorded: documentTotal > 0,
        detail: documentTotal
          ? `${documentTotal} file${documentTotal === 1 ? '' : 's'} on file`
          : 'No documents uploaded',
      },
      ...[...groups.entries()].map(([label, entry]) => ({
        label,
        recorded: true,
        detail: `${entry.count} file${entry.count === 1 ? '' : 's'} · latest ${printDateOnly(entry.latest)}`,
      })),
    ];

    const sections = [
      {
        title: 'Personal details',
        fields: [
          { label: 'Date of birth', value: printDateOnly(student.dateOfBirth) },
          { label: 'Gender', value: student.gender || 'Not recorded' },
          { label: 'Blood group', value: student.bloodGroup || 'Not recorded' },
          { label: 'Nationality', value: student.nationality || 'Not recorded' },
          { label: 'Aadhaar / ID number', value: student.aadhaar || 'Not recorded' },
          { label: 'Joined on', value: printDateOnly(student.joinedOn) },
        ],
      },
      {
        title: 'Contact',
        fields: [
          { label: 'Phone', value: student.phone || 'Not recorded' },
          { label: 'Email', value: student.email || 'Not recorded' },
          { label: 'Address', value: address },
          { label: 'Skill level', value: student.skillLevel || 'Not recorded' },
        ],
      },
      {
        title: 'Guardian',
        fields: [
          { label: 'Name', value: student.parentName || 'Not recorded' },
          { label: 'Relationship', value: student.parentRelation || 'Not recorded' },
          { label: 'Phone', value: student.parentPhone || 'Not recorded' },
          { label: 'Email', value: student.parentEmail || 'Not recorded' },
        ],
      },
      {
        title: 'Enrollment',
        fields: [
          { label: 'Batch', value: batchName || 'Not assigned' },
          { label: 'Batch code', value: batchCode || 'Not recorded' },
          { label: 'Program / plan', value: this.related(enrollment, 'fee_plan', 'name') || 'Not recorded' },
          { label: 'Status', value: this.text(enrollment, 'status') || 'Not recorded' },
          { label: 'Valid from', value: printDateOnly(this.text(enrollment, 'valid_from')) },
        ],
      },
      {
        title: 'Attendance',
        fields: [
          { label: 'Sessions recorded', value: String(summary.total) },
          { label: 'Present', value: String(summary.present) },
          { label: 'Late', value: String(summary.late) },
          { label: 'Absent', value: String(summary.absent) },
          { label: 'Attendance rate', value: `${summary.rate}%` },
        ],
      },
    ];

    if (medical) {
      sections.push({
        title: 'Medical',
        fields: [
          { label: 'Blood group', value: this.text(medical, 'blood_group') || 'Not recorded' },
          { label: 'Allergies', value: this.text(medical, 'allergies') || 'Not recorded' },
          { label: 'Conditions', value: this.text(medical, 'conditions') || 'Not recorded' },
          { label: 'Medications', value: this.text(medical, 'medications') || 'Not recorded' },
          {
            label: 'Emergency notes',
            value: this.text(medical, 'emergency_notes') || 'Not recorded',
          },
          { label: 'Doctor', value: this.text(medical, 'doctor_name') || 'Not recorded' },
          { label: 'Doctor phone', value: this.text(medical, 'doctor_phone') || 'Not recorded' },
        ],
      });
    }

    return {
      reference: printProfileReference('student', student.studentCode || student.id),
      issuedAt: new Date().toISOString(),
      profileKind: 'student',
      fullName: student.fullName,
      profileCode: student.studentCode || student.id,
      subtitle:
        [batchName || student.skillLevel, batchCode].filter(Boolean).join(' · ') ||
        'No batch assigned',
      status: student.status,
      photoUrl: student.photoUrl,
      sections,
      checklistTitle: 'Document checklist',
      checklist,
      documents: documents.map((row) => ({
        documentType: this.text(row, 'document_type') || 'Document',
        fileName: this.text(row, 'file_name') || 'Unnamed file',
        uploadedAt: this.text(row, 'created_at'),
        uploadedBy: this.related(row, 'uploader', 'full_name') || undefined,
      })),
      documentsNote:
        documentTotal > documents.length
          ? `Showing the ${documents.length} most recent of ${documentTotal} uploaded files.`
          : undefined,
    };
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
