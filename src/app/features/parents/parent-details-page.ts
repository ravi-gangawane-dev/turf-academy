import { TableTools } from '../../shared/data-table/table-tools';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { Pagination } from '../../shared/pagination/pagination';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { DataRequestError } from '../../core/supabase/data-error';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParentDetailRecord, ParentsService, PaymentsService, PaymentHistoryRecord, NotificationsService } from '../../core/supabase/domain-services';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivityEvent, StaffDetailsService } from '../../core/supabase/staff-details.service';
import { DatabaseService } from '../../core/supabase/database.service';
import { MutationAttempt } from '../../core/supabase/mutation-attempt';
interface ParentNotice { id:string;subject:string;body:string;channel:string;status:string;created_at:string; }
import { PageHero } from '../../shared/page-hero/page-hero';

@Component({
  selector: 'app-parent-details-page',
  imports: [TableTools, Pagination, AsyncState, StatusBadge, PageHero, AcademyMoneyPipe, DatePipe, ReactiveFormsModule, RouterLink],
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
  protected readonly compose = this.fb.nonNullable.group({ channel:['in_app',Validators.required],subject:['',[Validators.required,Validators.maxLength(120)]],body:['',[Validators.required,Validators.maxLength(1600)]] });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parents = inject(ParentsService);
  protected readonly parent = signal<ParentDetailRecord | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly success = signal(history.state?.success ?? '');
  private id = '';

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
    if(tab==='children'||tab==='compose'){this.panelLoading.set(false);return;}
    this.panelLoading.set(true);
    try {
      if(tab==='activity'){const result=await this.details.activity(this.id,page,this.pageSize());if(request!==this.panelRequest)return;this.activities.set(result.rows);this.total.set(result.total);}
      if(tab==='payments'){const ids=this.parent()?.student_parents.map(link=>link.student.id)??[];const result=await this.payments.ledgerPage('list',page,this.pageSize(),ids);if(request!==this.panelRequest)return;this.transactions.set(result.rows);this.total.set(result.total);}
      if(tab==='notifications'){const result=await this.notifications.page(page,this.pageSize(),undefined,undefined,this.id);if(request!==this.panelRequest)return;this.notices.set(result.rows as ParentNotice[]);this.total.set(result.total);}
    } catch(e){if(request===this.panelRequest)this.error.set(e instanceof Error?e.message:'Unable to load details.');}
    finally{if(request===this.panelRequest)this.panelLoading.set(false);}
  }
  protected async setPageSize(size: number): Promise<void> {
    this.pageSize.set(size);
    await this.selectTab(this.tab(), 1);
  }
  protected async sendMessage(): Promise<void> {
    if(this.compose.invalid||this.sending()){this.compose.markAllAsTouched();return;}
    this.sending.set(true);this.error.set('');
    try {
      const value=this.compose.getRawValue();
      const result=await this.db.client.rpc('queue_parent_message',{p_parent_id:this.id,p_channel:value.channel,p_subject:value.subject.trim(),p_body:value.body.trim(),p_reference:this.messageAttempt.key({parent:this.id,...value})});
      if(result.error)throw new DataRequestError('Load academy data', result.error);
      this.messageAttempt.complete();this.compose.reset({channel:'in_app',subject:'',body:''});
      this.success.set(value.channel==='in_app'?'Notification saved for this parent.':'Message queued for delivery.');await this.selectTab('notifications');
    }catch(e){this.error.set(e instanceof Error?e.message:'Message could not be queued.');}finally{this.sending.set(false);}
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
  protected openStudent(id: string): void {
    void this.router.navigate(['/students', id]);
  }
  protected list(): void {
    void this.router.navigateByUrl('/parents');
  }
  protected breadcrumb(label: string): void {
    if (label === 'Dashboard') void this.router.navigateByUrl('/dashboard');
    if (label === 'Parents') this.list();
  }
}
