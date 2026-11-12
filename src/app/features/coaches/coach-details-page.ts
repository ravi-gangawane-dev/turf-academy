import { TableTools } from '../../shared/data-table/table-tools';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachDetailRecord, CoachesService } from '../../core/supabase/domain-services';
import { PageHero } from '../../shared/page-hero/page-hero';
import { FormsModule } from '@angular/forms';
import { CoachAttendanceSummary, StaffDetailsService } from '../../core/supabase/staff-details.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { idCardNumber } from '../../shared/print/id-card-qr';
import {
  PrintDestination,
  PrintIdCardInput,
  PrintProfileChecklistItem,
  PrintProfileSheetInput,
} from '../../shared/print/print-document.models';
import { PrintIdCardDialog } from '../../shared/print/print-id-card-dialog/print-id-card-dialog';
import { printDateOnly, printProfileReference } from '../../shared/print/print-format';
@Component({
  selector: 'app-coach-details-page',
  imports: [TableTools, AsyncState, StatusBadge, PageHero, FormsModule, PrintIdCardDialog],
  templateUrl: './coach-details-page.html',
  styleUrl: './coach-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachDetailsPage implements OnInit {
  private readonly details = inject(StaffDetailsService);
  private readonly toast = inject(ToastService);
  private readonly printDocuments = inject(PrintDocumentService);
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
  protected readonly idCardOpen = signal(false);
  protected readonly idCardLoading = signal(false);
  protected readonly idCardError = signal('');
  protected readonly profileLoading = signal(false);
  private readonly idCardDestination = signal<PrintDestination>('preview');
  protected readonly idCard = computed<PrintIdCardInput | null>(() => {
    const coach = this.coach();
    if (!coach) return null;
    const specializations =
      coach.coach_specializations.map((row) => row.specialization).join(', ') || 'Not provided';
    const batches =
      coach.batch_coaches.map((link) => link.batch.name).join(', ') || 'No batches assigned';
    return {
      issuedAt: new Date().toISOString(),
      cardNumber: idCardNumber('coach', coach.employee_code || coach.id),
      holderType: 'coach',
      holderId: coach.id,
      fullName: coach.full_name,
      holderCode: coach.employee_code || coach.id,
      subtitle: specializations,
      photoUrl: coach.photo_url,
      details: [
        { label: 'Specialisations', value: specializations },
        { label: 'Qualification', value: coach.qualification || 'Not provided' },
        { label: 'Experience', value: `${coach.experience_years} years` },
        { label: 'Phone', value: coach.phone || 'Not provided' },
        { label: 'Batches', value: batches },
        { label: 'Joined', value: printDateOnly(coach.created_at) },
      ],
      validityNote: 'Valid while employed at the academy',
    };
  });
  protected readonly profileSheet = computed<PrintProfileSheetInput | null>(() => {
    const coach = this.coach();
    if (!coach) return null;
    const specialisations = coach.coach_specializations.map((row) => row.specialization).join(', ');
    const batches = coach.batch_coaches;
    const batchFields = batches.map((link) => ({
      label: link.batch.name,
      value: [
        link.batch.code,
        link.batch.age_group || 'All ages',
        [link.batch.start_time?.slice(0, 5), link.batch.end_time?.slice(0, 5)]
          .filter(Boolean)
          .join(' – ') || 'No fixed time',
        link.is_primary ? 'Primary coach' : 'Assistant coach',
      ]
        .filter(Boolean)
        .join(' · '),
    }));
    const checklist: PrintProfileChecklistItem[] = [
      {
        label: 'Profile photograph',
        recorded: Boolean(coach.photo_url),
        detail: coach.photo_url ? 'Photo on file' : 'No photo uploaded',
      },
      {
        label: 'Date of birth record',
        recorded: Boolean(coach.date_of_birth),
        detail: coach.date_of_birth ? printDateOnly(coach.date_of_birth) : 'Not recorded',
      },
      {
        label: 'Phone number',
        recorded: Boolean(coach.phone),
        detail: coach.phone || 'Not recorded',
      },
      {
        label: 'Email address',
        recorded: Boolean(coach.email),
        detail: coach.email || 'Not recorded',
      },
      {
        label: 'Qualification',
        recorded: Boolean(coach.qualification),
        detail: coach.qualification || 'Not recorded',
      },
      {
        label: 'Specialisations',
        recorded: coach.coach_specializations.length > 0,
        detail: specialisations || 'Not recorded',
      },
      {
        label: 'Biography',
        recorded: Boolean(coach.biography),
        detail: coach.biography ? 'Biography on file' : 'Not recorded',
      },
      {
        label: 'Batch assignment',
        recorded: batches.length > 0,
        detail: batches.length
          ? `${batches.length} assigned batch${batches.length === 1 ? '' : 'es'}`
          : 'No batches assigned',
      },
    ];
    return {
      reference: printProfileReference('coach', coach.employee_code || coach.id),
      issuedAt: new Date().toISOString(),
      profileKind: 'coach',
      fullName: coach.full_name,
      profileCode: coach.employee_code || coach.id,
      subtitle: specialisations || 'No specialisations recorded',
      status: coach.status,
      photoUrl: coach.photo_url,
      sections: [
        {
          title: 'Contact',
          fields: [
            { label: 'Phone', value: coach.phone || 'Not recorded' },
            { label: 'Email', value: coach.email || 'Not recorded' },
            { label: 'Date of birth', value: printDateOnly(coach.date_of_birth) },
          ],
        },
        {
          title: 'Employment',
          fields: [
            { label: 'Employee code', value: coach.employee_code || 'Not recorded' },
            { label: 'Status', value: coach.status },
            { label: 'Experience', value: `${coach.experience_years} years` },
            { label: 'Qualification', value: coach.qualification || 'Not recorded' },
            { label: 'Joined on', value: printDateOnly(coach.created_at) },
          ],
        },
        {
          title: 'Specialisations',
          fields: [
            { label: 'Specialisations', value: specialisations || 'Not recorded' },
          ],
        },
        {
          title: 'Assigned batches',
          fields: batchFields.length
            ? batchFields
            : [{ label: 'Batches', value: 'No batches assigned' }],
        },
        {
          title: 'Biography',
          fields: [{ label: 'Biography', value: coach.biography || 'No biography recorded' }],
        },
      ],
      checklistTitle: 'Profile checklist',
      checklist,
      documents: [],
    };
  });

  protected openIdCard(): void {
    if (!this.coach()) return;
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
  protected async printProfileSheet(): Promise<void> {
    if (this.profileLoading()) return;
    const sheet = this.profileSheet();
    if (!sheet) return;
    this.profileLoading.set(true);
    try {
      await this.printDocuments.printProfileSheet(sheet, 'preview');
    } catch {
      // The shared print service reports preparation failures through the toast.
    } finally {
      this.profileLoading.set(false);
    }
  }
  async ngOnInit(): Promise<void> {
    if (history.state?.success) this.toast.success(String(history.state.success));
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
