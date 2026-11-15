import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AcademyBackupService } from '../../core/supabase/academy-backup.service';
import { ToastService } from '../../shared/toast/toast.service';
import { LOCAL_KEYS, LocalStore } from '../../core/state/local-store';
import { RoleCatalogService } from '../../core/auth/role-catalog.service';
import { SettingsNavigation } from './settings-navigation';

@Component({
  selector: 'app-settings-tools-page',
  imports: [TableTools, PageHero, RouterLink, SettingsNavigation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./settings-tools-page.html',
  styleUrl:'./settings-tools-page.scss',
})
export class SettingsToolsPage implements OnInit {
  private readonly backup = inject(AcademyBackupService);
  private readonly toast = inject(ToastService);
  private readonly local = inject(LocalStore);
  protected readonly roleCatalog = inject(RoleCatalogService);
  protected readonly view = String(inject(ActivatedRoute).snapshot.data['settingsTool']);
  protected readonly roles = this.roleCatalog.roles;
  protected readonly permissions = this.roleCatalog.matrix;
  protected readonly permissionLabels = computed(() => {
    const labels = new Map(this.roleCatalog.permissions().map((permission) => [permission.key, permission]));
    return (key: string) => labels.get(key as never)?.label ?? key;
  });
  protected readonly rolePermissionSummary = computed(() => {
    const labels = this.permissionLabels();
    return this.roles().map((role) => ({
      ...role,
      permissionLabels: this.permissions()[role.key].map((permission) => labels(permission)),
    }));
  });
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
    if (this.view === 'permissions') void this.roleCatalog.load();
    let theme = document.documentElement.dataset['academyTheme'] || 'forest';
    theme = this.local.read(LOCAL_KEYS.theme) || theme;
    this.theme.set(this.themes.some((choice) => choice.id === theme) ? theme : 'forest');
  }
  protected async reloadCatalog(): Promise<void> {
    await this.roleCatalog.load(true);
  }
  protected setTheme(theme: string) {    this.theme.set(theme);
    document.documentElement.dataset['academyTheme'] = theme;
    this.toast.success(
      this.local.write(LOCAL_KEYS.theme, theme)
        ? 'Appearance saved.'
        : 'Appearance applied for this session.',
    );
  }
  protected async exportData() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');

    try {
      await this.backup.download((table) =>
        this.progress.set('Exporting ' + table.replaceAll('_', ' ') + '…'),
      );
      this.toast.success('Academy records exported.');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      this.busy.set(false);
      this.progress.set('');
    }
  }
}
