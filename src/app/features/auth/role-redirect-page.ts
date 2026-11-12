import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-role-redirect-page',
  templateUrl: './role-redirect-page.html',
  styleUrl: './role-redirect-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleRedirectPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly label = String(this.route.snapshot.data['label'] ?? 'Admin');
  protected readonly tagline = String(this.route.snapshot.data['tagline'] ?? 'Lead Manage Grow');
  protected readonly icon = String(this.route.snapshot.data['icon'] ?? 'pi pi-crown');
  ngOnInit() {
    const target =
      this.label === 'Coach'
        ? '/coach/dashboard'
        : this.label === 'Receptionist'
          ? '/dashboard/reception'
          : this.label === 'Parent'
            ? '/parent/dashboard'
            : '/dashboard/admin';
    setTimeout(() => void this.router.navigateByUrl(target), 1200);
  }
}
