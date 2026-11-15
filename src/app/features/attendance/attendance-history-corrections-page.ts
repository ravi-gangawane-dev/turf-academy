import { AttendanceViewNavigation } from './attendance-view-navigation';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  protected readonly tab = signal<Tab>(
    this.route.snapshot.data['tab'] === 'corrections' ||
      this.route.snapshot.queryParamMap.get('tab') === 'corrections'
      ? 'corrections'
      : 'history',
  );

}
