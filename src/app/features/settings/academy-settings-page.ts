import { UsersSettingsPanel } from './users-settings-panel';
import { SETTINGS_SECTIONS } from './settings-sections';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademySettingsService } from '../../core/supabase/domain-services';
import { DatabaseService } from '../../core/supabase/database.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { DialogService } from '../../shared/dialog/dialog.service';
import { DialogType } from '../../shared/dialog/models/dialog-config.model';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AuthService } from '../../core/auth/auth.service';
import { downloadDocument } from '../payments/document-pdf';

@Component({
  selector: 'app-academy-settings-page',
  imports: [ReactiveFormsModule, TitleCasePipe, PageHero, RouterLink, UsersSettingsPanel],
  templateUrl: './academy-settings-page.html',
  styleUrl: './academy-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademySettingsPage implements OnInit {
  protected readonly settingsDirectory = SETTINGS_SECTIONS;

  protected readonly themes = [
    { id: 'forest', label: 'Forest', description: 'Classic academy green' },
    { id: 'blue', label: 'Blue', description: 'Cool blue accents' },
    { id: 'contrast', label: 'High contrast', description: 'Stronger borders and text' },
  ];
  protected readonly deviceTheme = signal('forest');

  protected readonly sections = ['all settings', 'profile', 'operations', 'attendance', 'notifications', 'users', 'audit log', 'tools'];

  protected readonly activeSection = signal<'all settings' | 'profile' | 'operations' | 'attendance' | 'notifications' | 'users' | 'audit log' | 'tools'>('all settings');
  protected readonly pageInfo = computed(() => {
    const section = this.settingsDirectory.find(item => item.path === '/settings/' + this.activeSection());
    return section ?? { label: 'Academy Settings', description: 'Manage academy details, attendance rules, and communication preferences.' };
  });
  protected readonly breadcrumbs = computed(() => [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    ...(this.activeSection() === 'all settings'
      ? [{ label: 'Academy Settings' }]
      : [{ label: 'Academy Settings', route: '/settings' }, { label: this.pageInfo().label }]),
  ]);
  private readonly api = inject(AcademySettingsService);
  private readonly db = inject(DatabaseService);
  private readonly whatsapp = inject(WhatsappService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogs = inject(DialogService);
  protected readonly testRecipient = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly busy = signal(false);
  protected readonly progress = signal('');

  protected readonly form = this.fb.nonNullable.group({
    academyName: ['', [Validators.required, Validators.maxLength(120)]],
    academyCode: ['TCM', [Validators.pattern('^[A-Z]{2,10}$')]],
    academyLogo: ['', [Validators.maxLength(500)]],
    academyDescription: ['Turf Cricket Academy - Excellence in Cricket Training', [Validators.maxLength(500)]],
    contactEmail: ['', Validators.email],
    contactPhone: ['', [Validators.maxLength(30)]],
    address: ['', [Validators.maxLength(500)]],
    timezone: ['Asia/Kolkata', Validators.required],
    currencyCode: ['INR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    attendanceGraceMinutes: [10, [Validators.required, Validators.min(0), Validators.max(180)]],
    feeDueDay: [10, [Validators.required, Validators.min(1), Validators.max(28)]],
    inApp: [true],
    email: [false],
    whatsapp: [false],
    themePreference: ['forest'],
  });

  protected readonly auth = inject(AuthService);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });

  ngOnInit(): void {
    let theme = document.documentElement.dataset['academyTheme'] || 'forest';
    try { theme = localStorage.getItem('academy-theme') || theme; } catch { /* Device storage may be unavailable. */ }
    this.deviceTheme.set(this.themes.some(choice => choice.id === theme) ? theme : 'forest');
    const section = this.route?.snapshot.data['settingsSection'];
    if (section && this.sections.includes(section)) this.activeSection.set(section);
    this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const v = await this.api.get();
      this.form.patchValue({
        academyName: v.academy_name,
        academyCode: v.academy_code ?? 'TCM',
        academyLogo: v.academy_logo_url ?? '',
        academyDescription: v.academy_description ?? 'Turf Cricket Academy - Excellence in Cricket Training',
        contactEmail: v.contact_email ?? '',
        contactPhone: v.contact_phone ?? '',
        address: v.address ?? '',
        timezone: v.timezone,
        currencyCode: v.currency_code,
        attendanceGraceMinutes: v.attendance_grace_minutes,
        feeDueDay: v.fee_due_day,
        inApp: v.notification_channels?.includes('in_app') ?? true,
        email: v.notification_channels?.includes('email') ?? false,
        whatsapp: v.notification_channels?.includes('whatsapp') ?? false,
        themePreference: v.theme_preference ?? 'forest',
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Settings could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const v = this.form.getRawValue();
      await this.api.save({
        academy_name: v.academyName.trim(),
        academy_code: v.academyCode.trim(),
        academy_logo_url: v.academyLogo?.trim() || '',
        academy_description: v.academyDescription?.trim() || '',
        contact_email: v.contactEmail.trim() || null,
        contact_phone: v.contactPhone.trim() || null,
        address: v.address.trim() || null,
        timezone: v.timezone,
        currency_code: v.currencyCode.toUpperCase(),
        attendance_grace_minutes: v.attendanceGraceMinutes,
        fee_due_day: v.feeDueDay,
        notification_channels: [
          v.inApp ? 'in_app' : '',
          v.email ? 'email' : '',
          v.whatsapp ? 'whatsapp' : '',
        ].filter(Boolean),
        theme_preference: v.themePreference,
      });
      this.message.set('Academy settings saved.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Settings could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async exportData(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const records: Record<string, unknown[]> = {};
      const tables = ['academy_settings', 'profiles', 'students', 'parents', 'student_parents', 'coaches', 'coach_specializations', 'fee_plans', 'batches', 'batch_days', 'batch_coaches', 'batch_waitlist', 'enrollments', 'enrollment_history', 'attendance_records', 'attendance_corrections', 'monthly_charges', 'payments', 'payment_refunds', 'receipts', 'discounts', 'student_discounts', 'late_fee_rules', 'notifications', 'notification_templates', 'student_documents', 'student_medical_records', 'vaccinations'];
      for (const table of tables) {
        this.progress.set('Exporting ' + table.replaceAll('_', ' ') + '…');
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 500) {
          const columns =
            table === 'profiles'
              ? 'id,full_name,email,phone,role,status,is_active,created_at'
              : table === 'notifications'
                ? 'id,student_id,parent_id,channel,template_key,recipient,subject,body,status,scheduled_at,sent_at,created_at'
                : '*';
          let query = this.db.client
            .from(table)
            .select(columns)
            .range(offset, offset + 499);
          if (table === 'coach_specializations')
            query = query.order('coach_id').order('specialization');
          else if (table === 'batch_days') query = query.order('batch_id').order('day_of_week');
          else if (table === 'batch_coaches') query = query.order('batch_id').order('coach_id');
          else if (table === 'student_parents')
            query = query.order('student_id').order('parent_id');
          else query = query.order('id');
          const result = await query;
          if (result.error)
            throw new Error('The export could not be completed. Please try again.');
          if (!result.data) throw new Error('Could not export ' + table + ': no data returned.');
          rows.push(...result.data);
          if (result.data.length < 500) break;
        }
        records[table] = rows;
      }
      downloadDocument(
        new Blob(
          [
            JSON.stringify(
              { format: 'turf-academy-records-v1', exportedAt: new Date().toISOString(), records },
              null,
              2,
            ),
          ],
          { type: 'application/json' },
        ),
        'academy-records-' + new Date().toISOString().slice(0, 10) + '.json',
      );
      this.message.set('Academy records exported.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      this.busy.set(false);
      this.progress.set('');
    }
  }

  protected setDeviceTheme(theme: string): void {
    if (!this.themes.some(choice => choice.id === theme)) return;
    this.deviceTheme.set(theme);
    document.documentElement.dataset['academyTheme'] = theme;
    try {
      localStorage.setItem('academy-theme', theme);
      this.message.set('Appearance saved for this device.');
    } catch {
      this.message.set('Appearance applied for this session.');
    }
  }

  protected setActiveSection(section: string) {
    const path = section === 'all settings'
      ? '/settings'
      : section === 'audit log'
        ? '/settings/audit-logs'
        : '/settings/' + section;
    void this.router.navigateByUrl(path);
  }

  protected async openTestWhatsAppMessage(): Promise<void> {
    const role = this.auth.role();
    if (role !== 'admin') {
      this.error.set('Only admin users can send test messages.');
      return;
    }
    this.error.set('');
    this.message.set('');
    try {
      const academyName = this.form.controls.academyName.value || 'Turf Cricket Academy';
      if (!this.testRecipient().trim()) throw new Error('Enter a recipient number for the WhatsApp test.');
      const phone = this.whatsapp.normalizeRecipient(this.testRecipient());
      const message = `This is a test notification from ${academyName}. No attendance has been recorded by this test.`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      await this.dialogs.open({
        id: 'settings-test-whatsapp',
        type: DialogType.WHATSAPP,
        title: 'Preview WhatsApp test',
        message: `Recipient: +${phone}\\n\\n${message}\\n\\nReview the message and press Send in WhatsApp. Delivery cannot be verified here.`,
        confirmLabel: 'Open WhatsApp',
        actions: [
          {
            name: 'confirm',
            label: 'Open WhatsApp',
            action: () => {
              // Run directly from the dialog click to preserve browser user activation.
              try {
                if (this.auth.role() !== 'admin') throw new Error('Only admin users can open test messages.');
                window.open(url, '_blank', 'noopener,noreferrer');
                this.message.set('WhatsApp opening requested. Press Send in WhatsApp. Delivery is unconfirmed.');
              } catch (error) {
                this.error.set(error instanceof Error ? error.message : 'Failed to open WhatsApp.');
              }
            },
          },
        ],
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to open WhatsApp.');
    }
  }
}