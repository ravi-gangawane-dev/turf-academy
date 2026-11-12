import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth/auth.service';
import { AcademyFacade } from '../../core/state/academy.facade';
import { Permission } from '../../core/auth/permissions';
import { NotificationsService, ParentsService } from '../../core/supabase/domain-services';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';

interface NavigationItem {
  readonly label: string;
  readonly icon: string;
  readonly route?: string;
  readonly disabled?: boolean;
  readonly permission?: Permission;
  readonly section?: string;
}

@Component({
  selector: 'app-staff-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TitleCasePipe],
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffLayout implements OnInit {
  private readonly preferences = inject(AcademyPreferencesService);
  protected readonly auth = inject(AuthService);
  protected readonly academy = inject(AcademyFacade);
  protected readonly router = inject(Router);
  private readonly parents = inject(ParentsService);
  private readonly notifications = inject(NotificationsService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly menuOpen = signal(false);
  protected readonly coachAttendanceMenuOpen = signal(false);
  protected readonly profilePhoto = signal<string | null>(null);
  protected readonly bellCount = signal(0);
  protected readonly globalSearch = signal('');
  private notificationChannel?: RealtimeChannel;
  protected readonly navigation: readonly NavigationItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard', section: 'Overview' },
    { label: 'Students', icon: 'pi-users', route: '/students', permission: 'students:read', section: 'Academy' },
    { label: 'Parents', icon: 'pi-heart', route: '/parents', permission: 'parents:read', section: 'Academy' },
    { label: 'Coaches', icon: 'pi-id-card', route: '/coaches', permission: 'coaches:read', section: 'Academy' },
    { label: 'Batches', icon: 'pi-calendar', route: '/batches', permission: 'batches:read', section: 'Academy' },
    {
      label: 'Enrollment',
      icon: 'pi-user-plus',
      route: '/enrollments',
      permission: 'enrollments:write',
      section: 'Academy',
    },
    {
      label: 'Attendance',
      icon: 'pi-verified',
      route: '/attendance',
      permission: 'attendance:read',
      section: 'Operations',
    },
    { label: 'Fees', icon: 'pi-wallet', route: '/fees', permission: 'fees:write', section: 'Operations' },
    { label: 'Payments', icon: 'pi-credit-card', route: '/payments', permission: 'fees:write', section: 'Operations' },
    {
      label: 'Notifications',
      icon: 'pi-bell',
      route: '/notifications',
      permission: 'notifications:read',
      section: 'Management',
    },
    { label: 'Reports', icon: 'pi-chart-bar', route: '/reports', permission: 'reports:read', section: 'Management' },
    { label: 'Settings', icon: 'pi-cog', route: '/settings', permission: 'settings:write', section: 'Management' },
  ];
  private readonly parentNavigation: readonly NavigationItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/parent/dashboard', section: 'Overview' },
    {
      label: 'My Children',
      icon: 'pi-users',
      route: '/parent/children',
      permission: 'children:read',
      section: 'Academy',
    },
    {
      label: 'Attendance',
      icon: 'pi-calendar-clock',
      route: '/parent/attendance',
      permission: 'children:read',
      section: 'Academy',
    },
    {
      label: 'Schedule',
      icon: 'pi-calendar',
      route: '/parent/schedule',
      permission: 'children:read',
      section: 'Academy',
    },
    { label: 'Fees', icon: 'pi-wallet', route: '/parent/fees', permission: 'children:read', section: 'Billing' },
    {
      label: 'Payments',
      icon: 'pi-credit-card',
      route: '/parent/payments',
      permission: 'children:read',
      section: 'Billing',
    },
    {
      label: 'Receipts',
      icon: 'pi-receipt',
      route: '/parent/receipts',
      permission: 'children:read',
      section: 'Billing',
    },
    {
      label: 'Coach',
      icon: 'pi-id-card',
      route: '/parent/coach',
      permission: 'children:read',
      section: 'Communication',
    },
    {
      label: 'Notifications',
      icon: 'pi-bell',
      route: '/parent/notifications',
      permission: 'children:read',
      section: 'Communication',
    },
    { label: 'Profile', icon: 'pi-user', route: '/parent/profile', permission: 'children:read', section: 'Support' },
    {
      label: 'Help & Support',
      icon: 'pi-question-circle',
      route: '/parent/support',
      permission: 'children:read',
      section: 'Support',
    },
  ];
  private readonly coachNavigation: readonly NavigationItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/coach/dashboard', permission: 'coach:portal', section: 'Overview' },
    {
      label: 'My Batches',
      icon: 'pi-th-large',
      route: '/coach/batches',
      permission: 'coach:portal',
      section: 'Training',
    },
    {
      label: 'My Students',
      icon: 'pi-users',
      route: '/coach/students',
      permission: 'coach:portal',
      section: 'Training',
    },
    {
      label: 'Attendance',
      icon: 'pi-calendar-clock',
      route: '/coach/attendance',
      permission: 'coach:portal',
      section: 'Training',
    },
    {
      label: 'Schedule',
      icon: 'pi-calendar',
      route: '/coach/schedule',
      permission: 'coach:portal',
      section: 'Training',
    },
    {
      label: 'Attendance Summary',
      icon: 'pi-chart-bar',
      route: '/coach/attendance/summary',
      permission: 'coach:portal',
      section: 'Training',
    },
    {
      label: 'Notifications',
      icon: 'pi-bell',
      route: '/coach/notifications',
      permission: 'coach:portal',
      section: 'Communication',
    },
    { label: 'Profile', icon: 'pi-user', route: '/coach/profile', permission: 'coach:portal', section: 'Support' },
    {
      label: 'Help & Support',
      icon: 'pi-question-circle',
      route: '/coach/support',
      permission: 'coach:portal',
      section: 'Support',
    },
  ];

  protected navigationItems(): readonly NavigationItem[] {
    const role = this.auth.session()?.user?.role;
    return role === 'parent'
      ? this.parentNavigation
      : role === 'coach'
        ? this.coachNavigation
        : this.navigation;
  }

  protected isSectionHeaderVisible(item: NavigationItem): boolean {
    if (!item.section) return false;
    const items = this.navigationItems().filter((i) => this.auth.hasPermission(i.permission));
    const firstItem = items.find((i) => i.section === item.section);
    return firstItem === item;
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }
  protected toggleCoachAttendanceMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.coachAttendanceMenuOpen.update((open) => !open);
  }
  protected submitGlobalSearch(): void {
    const query = this.globalSearch().trim();
    if (!query) return;
    const destination = this.auth.role() === 'coach' ? '/coach/students' : '/search';
    void this.router.navigate([destination], { queryParams: { q: query } });
  }

  protected clearSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.globalSearch.set('');
  }

  @HostListener('window:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      if (this.auth.role() !== 'parent') {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[aria-label="Search academy"]');
        searchInput?.focus();
        searchInput?.select();
      }
    }
  }
  ngOnInit(): void {
    try { const theme = localStorage.getItem('academy-theme'); if (theme && ['forest', 'blue', 'contrast'].includes(theme)) document.documentElement.dataset['academyTheme'] = theme; } catch {/* Default appearance remains usable without local storage. */ }
    void this.preferences.load().catch(() => undefined);
    void this.loadProfilePhoto();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => void this.loadProfilePhoto());
    if (
      this.supabase.configured &&
      (this.auth.hasPermission('notifications:read') ||
        this.auth.role() === 'parent' ||
        this.auth.role() === 'coach')
    ) {
      this.notificationChannel = this.notifications.subscribe(() => void this.loadBellCount());
      void this.loadBellCount();
      this.destroyRef.onDestroy(() => {
        if (this.notificationChannel) void this.notificationChannel.unsubscribe();
      });
    }
  }

  private async loadBellCount(): Promise<void> {
    try {
      const role = this.auth.role();
      this.bellCount.set(
        role === 'parent' || role === 'coach'
          ? await this.notifications.unreadCount()
          : await this.notifications.attentionCount(),
      );
    } catch {
      this.bellCount.set(0);
    }
  }

  protected bellLabel(): string {
    const count = this.bellCount();
    if (!count) return 'Notifications';
    return this.auth.role() === 'parent' || this.auth.role() === 'coach'
      ? `Notifications, ${count} unread`
      : `Notifications, ${count} failed`;
  }

  private async loadProfilePhoto(): Promise<void> {
    const role = this.auth.session()?.user?.role;
    if (role !== 'parent' && role !== 'coach') {
      this.profilePhoto.set(null);
      return;
    }
    const profileId = this.auth.profile()?.id;
    if (!profileId) return;
    try {
      if (role === 'parent') {
        this.profilePhoto.set((await this.parents.getByProfile(profileId)).photo_url ?? null);
        return;
      }
      const result = await this.supabase
        .requireClient()
        .from('coaches')
        .select('photo_url,photo_path')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (result.error) throw result.error;
      const photo = result.data?.photo_url
        ? result.data.photo_url
        : result.data?.photo_path
          ? await this.storage.signedUrl('coach-photos', result.data.photo_path, 3600)
          : null;
      this.profilePhoto.set(photo ?? null);
    } catch {
      this.profilePhoto.set(null);
    }
  }
  protected itemRoute(item: NavigationItem): string | undefined {
    if (item.label !== 'Dashboard') return item.route;
    switch (this.auth.session()?.user?.role) {
      case 'parent':
        return '/parent/dashboard';
      case 'coach':
        return '/coach/dashboard';
      case 'receptionist':
        return '/dashboard/reception';
      default:
        return '/dashboard/admin';
    }
  }

  protected itemLabel(item: NavigationItem): string {
    return this.auth.session()?.user?.role === 'parent' && item.label === 'Students'
      ? 'My Children'
      : item.label;
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/auth/login');
  }
}
