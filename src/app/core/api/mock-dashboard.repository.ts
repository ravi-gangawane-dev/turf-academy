import { computed, inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { delay, Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard.model';
import { AcademyStore } from '../state/academy.store';
import { AcademyPreferencesService } from '../supabase/academy-preferences.service';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class MockDashboardRepository implements DashboardRepository {
  private readonly preferences = inject(AcademyPreferencesService);
  private readonly inr = (paise: number) => this.preferences.money(paise / 100);
  /** Check-in labels follow the academy clock, like every other time on screen. */
  private time(value: string): string {
    return new Intl.DateTimeFormat(this.preferences.locale(), {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.preferences.timezone(),
    }).format(new Date(value));
  }
  private readonly summary = computed<DashboardSummary>(() => {
    const attendance = this.store.attendance();
    const feeRows = this.store.feeRows();
    const pendingPaise = feeRows.reduce((total, charge) => total + charge.balancePaise, 0);
    return {
      academyName: this.preferences.value().academy_name,
      businessDateLabel: new Intl.DateTimeFormat(this.preferences.locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: this.preferences.timezone() }).format(new Date()),
      metrics: [
        { label: 'Active students', value: String(this.store.students().filter((item) => item.status === 'active').length), hint: `${this.store.activeEnrollmentRows().length} enrolled`, icon: 'pi-users', tone: 'green' },
        { label: 'Present today', value: String(attendance.length), hint: `${attendance.filter((item) => item.status === 'checked-out').length} checked out`, icon: 'pi-check-circle', tone: 'blue' },
        { label: 'Pending fees', value: this.inr(pendingPaise), hint: `${feeRows.filter((item) => item.balancePaise > 0).length} open charges`, icon: 'pi-wallet', tone: 'amber' },
        { label: 'Total coaches', value: String(this.store.coaches().filter((item) => item.status === 'active').length), hint: 'Active coaches', icon: 'pi-id-card', tone: 'violet' },
        { label: 'Active batches', value: String(this.store.batches().filter((item) => item.status !== 'completed').length), hint: 'Current batches', icon: 'pi-calendar', tone: 'amber' },
        { label: 'Total parents', value: String(this.store.parents().filter((item) => item.status !== 'inactive').length), hint: 'Active parent profiles', icon: 'pi-heart', tone: 'green' },
      ],
      checkIns: attendance.slice(-3).reverse().map((record) => {
        const studentName = this.store.students().find((item) => item.id === record.studentId)?.name ?? 'Unknown';
        return { id: record.id, studentName, initials: studentName.split(' ').map((part) => part[0]).join('').slice(0, 2), batchName: this.store.batches().find((item) => item.id === record.batchId)?.name ?? 'Unknown', checkedInAt: this.time(record.checkInAt), status: record.status === 'late' ? 'Late' as const : 'On time' as const };
      }),
      pendingFees: feeRows.filter((item) => item.balancePaise > 0).slice(0, 3).map((charge) => ({ id: charge.id, studentName: charge.studentName, batchName: charge.period, amountPaise: charge.balancePaise, dueLabel: `Due ${charge.dueDate}`, overdue: charge.status === 'Overdue' })),
    };
  });

  private readonly store = inject(AcademyStore);

  getSummary(): Observable<DashboardSummary> {
    return toObservable(this.summary).pipe(delay(150));
  }
}
