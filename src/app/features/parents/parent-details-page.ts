import { TableTools } from '../../shared/data-table/table-tools';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { Pagination } from '../../shared/pagination/pagination';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { DataRequestError } from '../../core/supabase/data-error';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParentDetailRecord, ParentsService, PaymentsService, PaymentHistoryRecord, NotificationsService } from '../../core/supabase/domain-services';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivityEvent, StaffDetailsService } from '../../core/supabase/staff-details.service';
import { DatabaseService } from '../../core/supabase/database.service';
import { MutationAttempt } from '../../core/supabase/mutation-attempt';
import { idCardNumber } from '../../shared/print/id-card-qr';
import {
  PrintDestination,
  PrintIdCardInput,
  PrintProfileChecklistItem,
  PrintProfileSheetInput,
} from '../../shared/print/print-document.models';
import { PrintIdCardDialog } from '../../shared/print/print-id-card-dialog/print-id-card-dialog';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { printDateOnly, printProfileReference } from '../../shared/print/print-format';
interface ParentNotice { id: string; subject: string; body: string; channel: string; status: string; created_at: string; }
import { PageHero } from '../../shared/page-hero/page-hero';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-parent-details-page',
  imports: [TableTools, Pagination, AsyncState, StatusBadge, PageHero, AcademyMoneyPipe, DatePipe, ReactiveFormsModule, RouterLink, PrintIdCardDialog],
  templateUrl: './parent-details-page.html',
  styleUrl: './parent-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentDetailsPage implements OnInit {
  private readonly details = inject(StaffDetailsService);
  private readonly payments = inject(PaymentsService);
  private readonly notifications = inject(NotificationsService);
  private readonly db = inject(DatabaseService);
  private readonly fb = inject(FormBuilder);
  private readonly messageAttempt = new MutationAttempt();
  private panelRequest = 0;
  protected readonly tab = signal('children');
  protected readonly panelLoading = signal(false);
  protected readonly sending = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly total = signal(0);
  protected readonly activities = signal<ActivityEvent[]>([]);
  protected readonly transactions = signal<PaymentHistoryRecord[]>([]);
  protected readonly notices = signal<ParentNotice[]>([]);
  protected readonly compose = this.fb.nonNullable.group({ channel: ['in_app', Validators.required], subject: ['', [Validators.required, Validators.maxLength(120)]], body: ['', [Validators.required, Validators.maxLength(1600)]] });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parents = inject(ParentsService);
  private readonly toast = inject(ToastService);
  protected readonly parent = signal<ParentDetailRecord | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly idCardOpen = signal(false);
  protected readonly idCardLoading = signal(false);
  protected readonly idCardError = signal('');
  protected readonly profileLoading = signal(false);
  private readonly idCardDestination = signal<PrintDestination>('preview');
  private readonly printDocuments = inject(PrintDocumentService);
  private id = '';

  /**
   * Guardian card content comes entirely from the live parent record: contact
   * details, linked children and each child's pickup authorisation. The
   * revocation note is policy text shown on the card, not stored data.
   */
  protected readonly idCard = computed<PrintIdCardInput | null>(() => {
    const parent = this.parent();
    if (!parent) return null;
    const children = parent.student_parents ?? [];
    const childList =
      children
        .map((link) =>
          link.student.student_code
            ? `${link.student.full_name} (${link.student.student_code})`
            : link.student.full_name,
        )
        .join(', ') || 'No linked students';
    const pickup =
      children
        .map(
          (link) =>
            `${link.student.full_name}: ${link.can_pick_up ? 'authorised' : 'not authorised'}`,
        )
        .join('; ') || 'No pickup authorisations recorded';
    return {
      issuedAt: new Date().toISOString(),
      cardNumber: idCardNumber('parent', parent.id),
      holderType: 'parent',
      holderId: parent.id,
      fullName: parent.full_name,
      holderCode: parent.id,
      subtitle: parent.relation || 'Guardian',
      photoUrl: parent.photo_url,
      details: [
        { label: 'Relation', value: parent.relation || 'Guardian' },
        { label: 'Phone', value: parent.phone || 'Not provided' },
        { label: 'WhatsApp', value: parent.whatsapp || parent.phone || 'Not provided' },
        { label: 'Email', value: parent.email || 'Not provided' },
        { label: 'Children', value: childList },
        { label: 'Pickup', value: pickup },
        {
          label: 'Revocation',
          value: 'Report a lost card to the academy; access is revoked from Parent Details.',
        },
      ],
      validityNote: 'Valid while linked to an active student · revoke if lost',
    };
  });

  protected readonly profileSheet = computed<PrintProfileSheetInput | null>(() => {
    const parent = this.parent();
    if (!parent) return null;
    const address = parent.address;
    const addressLine =
      [address?.formatted, address?.address, address?.city, address?.state, address?.pinCode]
        .filter(Boolean)
        .join(', ') || 'Not recorded';
    const linked = parent.student_parents ?? [];
    const linkedFields = linked.map((link) => ({
      label: link.student.full_name,
      value: [
        link.student.student_code || link.student.id,
        link.student.status,
        link.can_pick_up ? 'Authorised for pickup' : 'Not authorised for pickup',
        link.is_primary ? 'Primary guardian' : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }));
    const checklist: PrintProfileChecklistItem[] = [
      {
        label: 'Profile photograph',
        recorded: Boolean(parent.photo_url),
        detail: parent.photo_url ? 'Photo on file' : 'No photo uploaded',
      },
      {
        label: 'Phone number',
        recorded: Boolean(parent.phone),
        detail: parent.phone || 'Not recorded',
      },
      {
        label: 'Email address',
        recorded: Boolean(parent.email),
        detail: parent.email || 'Not recorded',
      },
      {
        label: 'Residential address',
        recorded: Boolean(address?.formatted || address?.address || address?.city),
        detail: addressLine,
      },
      {
        label: 'Communication preference',
        recorded: Boolean(parent.communication_preferences?.channel),
        detail: parent.communication_preferences?.channel || 'Not recorded',
      },
      {
        label: 'Linked student',
        recorded: linked.length > 0,
        detail: linked.length
          ? `${linked.length} linked student${linked.length === 1 ? '' : 's'}`
          : 'No linked students',
      },
    ];
    return {
      reference: printProfileReference('parent', parent.id),
      issuedAt: new Date().toISOString(),
      profileKind: 'parent',
      fullName: parent.full_name,
      profileCode: parent.id,
      subtitle: parent.relation || 'Guardian',
      status: parent.status,
      photoUrl: parent.photo_url,
      sections: [
        {
          title: 'Contact',
          fields: [
            { label: 'Phone', value: parent.phone || 'Not recorded' },
            { label: 'WhatsApp', value: parent.whatsapp || parent.phone || 'Not recorded' },
            { label: 'Email', value: parent.email || 'Not recorded' },
            { label: 'Occupation', value: parent.occupation || 'Not recorded' },
            {
              label: 'Preferred contact',
              value: parent.communication_preferences?.channel || 'Not recorded',
            },
          ],
        },
        {
          title: 'Address',
          fields: [
            { label: 'Address', value: address?.formatted || address?.address || 'Not recorded' },
            { label: 'City', value: address?.city || 'Not recorded' },
            { label: 'State', value: address?.state || 'Not recorded' },
            { label: 'PIN code', value: address?.pinCode || address?.pin_code || 'Not recorded' },
          ],
        },
        {
          title: 'Account',
          fields: [
            { label: 'Relation', value: parent.relation || 'Guardian' },
            { label: 'Status', value: parent.status },
            { label: 'On record since', value: printDateOnly(parent.created_at) },
          ],
        },
        {
          title: 'Linked students',
          fields: linkedFields.length
            ? linkedFields
            : [{ label: 'Linked students', value: 'No linked students recorded' }],
        },
      ],
      checklistTitle: 'Profile checklist',
      checklist,
      documents: [],
    };
  });

  constructor() {
    if (history.state?.success) this.toast.success(String(history.state.success));
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) {
      this.error.set('Parent ID is missing.');
      this.loading.set(false);
      return;
    }
    try {
      this.parent.set(await this.parents.getById(this.id));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Parent could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  protected addressPart(key: 'formatted' | 'city' | 'state' | 'pinCode'): string {
    const address = this.parent()?.address;
    return address?.[key] || (key === 'formatted' ? address?.['address'] : '') || 'Not provided';
  }
  protected preference(): string {
    return this.parent()?.['communication_preferences']?.['channel'] ?? 'Not provided';
  }
  protected async selectTab(tab: string, page = 1): Promise<void> {
    this.tab.set(tab); this.page.set(page); this.total.set(0); this.error.set('');
    const request = ++this.panelRequest;
    if (tab === 'children' || tab === 'compose') { this.panelLoading.set(false); return; }
    this.panelLoading.set(true);
    try {
      if (tab === 'activity') { const result = await this.details.activity(this.id, page, this.pageSize()); if (request !== this.panelRequest) return; this.activities.set(result.rows); this.total.set(result.total); }
      if (tab === 'payments') { const ids = this.parent()?.student_parents.map(link => link.student.id) ?? []; const result = await this.payments.ledgerPage('list', page, this.pageSize(), ids); if (request !== this.panelRequest) return; this.transactions.set(result.rows); this.total.set(result.total); }
      if (tab === 'notifications') { const result = await this.notifications.page(page, this.pageSize(), undefined, undefined, this.id); if (request !== this.panelRequest) return; this.notices.set(result.rows as ParentNotice[]); this.total.set(result.total); }
    } catch (e) { if (request === this.panelRequest) this.error.set(e instanceof Error ? e.message : 'Unable to load details.'); }
    finally { if (request === this.panelRequest) this.panelLoading.set(false); }
  }
  protected async setPageSize(size: number): Promise<void> {
    this.pageSize.set(size);
    await this.selectTab(this.tab(), 1);
  }
  protected async sendMessage(): Promise<void> {
    if (this.compose.invalid || this.sending()) { this.compose.markAllAsTouched(); return; }
    this.sending.set(true); this.error.set('');
    try {
      const value = this.compose.getRawValue();
      const result = await this.db.client.rpc('queue_parent_message', { p_parent_id: this.id, p_channel: value.channel, p_subject: value.subject.trim(), p_body: value.body.trim(), p_reference: this.messageAttempt.key({ parent: this.id, ...value }) });
      if (result.error) throw new DataRequestError('Load academy data', result.error);
      this.messageAttempt.complete(); this.compose.reset({ channel: 'in_app', subject: '', body: '' });
      this.toast.success(value.channel === 'in_app' ? 'Notification saved for this parent.' : 'Message queued for delivery.'); await this.selectTab('notifications');
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'Message could not be queued.'); } finally { this.sending.set(false); }
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected edit(): void {
    void this.router.navigate(['/parents', this.id, 'edit']);
  }
  protected openIdCard(): void {
    if (!this.parent()) return;
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
        error instanceof Error ? error.message : 'The guardian card could not be prepared.',
      );
    } finally {
      this.idCardLoading.set(false);
    }
  }
  protected openStudent(id: string): void {
    void this.router.navigate(['/students', id]);
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
  protected list(): void {
    void this.router.navigateByUrl('/parents');
  }
  protected breadcrumb(label: string): void {
    if (label === 'Dashboard') void this.router.navigateByUrl('/dashboard');
    if (label === 'Parents') this.list();
  }
}
