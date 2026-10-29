import { AttendanceViewNavigation } from './attendance-view-navigation';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AttendanceHistoryPage } from './attendance-history-page';
import { AttendanceCorrectionPage } from './attendance-correction-page';

type Tab = 'history' | 'corrections';

/**
 * One route for attendance history and its correction queue.
 * Both tabs keep their own tested views; this shell only owns the heading,
 * the tab state and the URL so deep links to either view keep working.
 */
@Component({
  selector: 'app-attendance-history-corrections-page',
  imports: [AttendanceViewNavigation, PageHero, AttendanceHistoryPage, AttendanceCorrectionPage],
  templateUrl: './attendance-history-corrections-page.html',
  styleUrl: './attendance-history-corrections-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHistoryCorrectionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs: readonly { id: Tab; label: string; icon: string }[] = [
    { id: 'history', label: 'Attendance History', icon: 'pi-list' },
    { id: 'corrections', label: 'Attendance Corrections', icon: 'pi-pencil' },
  ];

  protected readonly tab = signal<Tab>(
    this.route.snapshot.data['tab'] === 'corrections' ||
      this.route.snapshot.queryParamMap.get('tab') === 'corrections'
      ? 'corrections'
      : 'history',
  );

  protected select(tab: Tab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'corrections' ? 'corrections' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
