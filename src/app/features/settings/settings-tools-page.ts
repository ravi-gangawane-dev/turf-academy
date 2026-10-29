import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatabaseService } from '../../core/supabase/database.service';
import { ROLE_PERMISSIONS } from '../../core/auth/permissions';
import { downloadDocument } from '../payments/document-pdf';
import { SettingsNavigation } from './settings-navigation';

const exportTables = [
  'academy_settings',
  'profiles',
  'students',
  'parents',
  'student_parents',
  'coaches',
  'coach_specializations',
  'fee_plans',
  'batches',
  'batch_days',
  'batch_coaches',
  'batch_waitlist',
  'enrollments',
  'enrollment_history',
  'attendance_records',
  'attendance_corrections',
  'monthly_charges',
  'payments',
  'payment_refunds',
  'receipts',
  'discounts',
  'student_discounts',
  'late_fee_rules',
  'notifications',
  'notification_templates',
  'student_documents',
  'student_medical_records',
  'vaccinations',
] as const;
@Component({
  selector: 'app-settings-tools-page',
  imports: [TableTools, PageHero, RouterLink, SettingsNavigation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="app-list-page settings-tools">

    <app-page-hero [breadcrumbs]="[{label:'Dashboard',icon:'pi-home',route:'/dashboard'},{label: view === 'backup' ? 'Academy Data Export' : view === 'theme' ? 'Appearance' : 'Role Permissions'}]" title="{{ view === 'backup' ? 'Academy Data Export' : view === 'theme' ? 'Appearance' : 'Role Permissions' }}" subtitle="Manage academy access, appearance and records." />
    <app-settings-navigation />
    <div class="tool-content">
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (view === 'permissions') {
      <p>
        Access granted to each academy role. Assign roles through
        <a routerLink="/settings/users">Users &amp; roles</a>.
      </p>
      <div class="table-wrap">
        <app-table-tools title="Role permissions" [table]="exportTable1"></app-table-tools>
<table #exportTable1 class="academy-table">
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Permissions</th>
            </tr>
          </thead>
          <tbody>
            @for (role of roles; track role) {
              <tr>
                <th scope="row">{{ role }}</th>
                <td>{{ permissions[role].join(', ') }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    @if (view === 'theme') {
      <p>Choose the academy interface colors on this device.</p>
      <div class="themes">
        @for (choice of themes; track choice.id) {
          <button
            [class.active]="theme() === choice.id"
            [attr.aria-pressed]="theme() === choice.id"
            (click)="setTheme(choice.id)"
          >
            {{ choice.label }}
          </button>
        }
      </div>
      <p>Saved preferences apply when you reopen the app on this device.</p>
    }
    @if (view === 'backup') {
      <p>
        Download academy records as JSON. This export includes personal and financial records; store
        it securely.
      </p>
      <p>
        Uploaded files, login accounts, QR tokens and audit history are not included. Use the
        database provider's backup tools for a complete backup and restore.
      </p>
      <button (click)="exportData()" [disabled]="busy()">
        {{ busy() ? 'Preparing export…' : 'Download academy data' }}
      </button>
      <p role="status" aria-live="polite">{{ progress() }}</p>
    }
    </div>
  </section>`,
  styles: [
    `
      .settings-tools {
        width: 100%;
        max-width: 1200px;
        margin-inline: auto;
        padding: 0;
        color: var(--app-text);
      }
      .settings-tools > a { display: inline-block; margin-bottom: 16px; color: var(--app-primary-dark); }
      .tool-content {
        background: var(--app-card);
        padding: 24px;
        border: 1px solid var(--app-border);
        border-radius: 14px;
      }
      button {
        font: inherit;
        border: 1px solid var(--app-border);
        padding: 12px;
        border-radius: 8px;
        margin: 8px;
        background: var(--app-card);
        color: var(--app-text);
      }
      button.active {
        border: 2px solid var(--app-primary);
        background: var(--app-primary-soft);
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td,
      th {
        text-align: left;
        padding: 14px;
        border-bottom: 1px solid var(--app-border);
      }
      h1 {
        margin: 16px 0;
      }
      p {
        margin: 14px 0;
      }
    `,
  ],
})
export class SettingsToolsPage implements OnInit {
  private readonly db = inject(DatabaseService);
  protected readonly view = String(inject(ActivatedRoute).snapshot.data['settingsTool']);
  protected readonly roles = ['admin', 'receptionist', 'coach', 'parent'] as const;
  protected readonly permissions = ROLE_PERMISSIONS;
  protected readonly themes = [
    { id: 'forest', label: 'Forest' },
    { id: 'blue', label: 'Blue' },
    { id: 'contrast', label: 'High contrast' },
  ];
  protected readonly theme = signal('forest');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly progress = signal('');
  ngOnInit() {
    let theme = document.documentElement.dataset['academyTheme'] || 'forest';
    try {
      theme = localStorage.getItem('academy-theme') || theme;
    } catch {
      /* Storage can be disabled by the browser. */
    }
    this.theme.set(this.themes.some((choice) => choice.id === theme) ? theme : 'forest');
  }
  protected setTheme(theme: string) {
    this.theme.set(theme);
    document.documentElement.dataset['academyTheme'] = theme;
    try {
      localStorage.setItem('academy-theme', theme);
      this.message.set('Appearance saved.');
    } catch {
      this.message.set('Appearance applied for this session.');
    }
  }
  protected async exportData() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const records: Record<string, unknown[]> = {};
      for (const table of exportTables) {
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
}
