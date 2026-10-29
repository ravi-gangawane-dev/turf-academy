import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-role-redirect-page',
  template: `<main class="redirect">
    <section class="visual">
      <img src="/branding/turf-cricket-academy-logo.png" alt="Turf Cricket Academy" /><strong>{{
        tagline
      }}</strong
      ><small>Train today<br />Build tomorrow</small>
    </section>
    <section class="card">
      <i [class]="icon"></i>
      <h1>Welcome, {{ label }}!</h1>
      <p>Redirecting to your dashboard…</p>
      <div class="bar"><span></span></div>
      <ul>
        <li><i class="pi pi-check-circle"></i> Initializing permissions</li>
        <li><i class="pi pi-check-circle"></i> Preparing dashboard</li>
        <li><i class="pi pi-check-circle"></i> Almost ready…</li>
      </ul>
    </section>
  </main>`,
  styles: [
    `
      :host {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
        background: #edf7f3;
      }
      .redirect {
        display: grid;
        grid-template-columns: 46% 54%;
        width: min(760px, 100%);
        min-height: 440px;
        overflow: hidden;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 16px 45px rgba(4, 42, 27, 0.18);
      }
      .visual {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 28px;
        color: #fff;
        background:
          radial-gradient(circle at 50% 85%, rgba(24, 184, 75, 0.4), transparent 38%),
          linear-gradient(160deg, #032f26, #0e7540);
      }
      .visual img {
        width: 145px;
        margin: auto auto 30px;
      }
      .visual strong {
        font-size: 22px;
        line-height: 1.05;
        text-transform: uppercase;
      }
      .visual small {
        margin-top: 35px;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .card {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 52px;
      }
      .card > i {
        align-self: center;
        color: #139c4e;
        font-size: 42px;
      }
      .card h1 {
        margin: 20px 0 5px;
        text-align: center;
        font-size: 24px;
      }
      .card p {
        text-align: center;
        color: #687a71;
        font-size: 13px;
      }
      .bar {
        height: 5px;
        margin: 18px 0 25px;
        border-radius: 8px;
        background: #dfe9e4;
      }
      .bar span {
        display: block;
        width: 72%;
        height: 100%;
        border-radius: inherit;
        background: #16a857;
        animation: progress 1.3s ease-in-out infinite;
      }
      ul {
        display: grid;
        gap: 15px;
        margin: 0;
        padding: 0;
        list-style: none;
        color: #66786f;
        font-size: 13px;
      }
      li i {
        margin-right: 10px;
        color: #15a456;
      }
      @keyframes progress {
        50% {
          width: 90%;
        }
      }
      @media (max-width: 650px) {
        .redirect {
          grid-template-columns: 1fr;
        }
        .visual {
          display: none;
        }
        .card {
          padding: 40px 26px;
        }
      }
    `,
  ],
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
