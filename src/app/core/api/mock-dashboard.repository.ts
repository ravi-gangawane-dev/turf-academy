import { computed, inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { delay, Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard.model';
import { AcademyStore } from '../state/academy.store';
import { DashboardRepository } from './dashboard.repository';

const inr = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

@Injectable()
export class MockDashboardRepository implements DashboardRepository {
  private readonly summary = computed<DashboardSummary>(() => {
    const attendance = this.store.attendance();
    const feeRows = this.store.feeRows();
    const pendingPaise = feeRows.reduce((total, charge) => total + charge.balancePaise, 0);
    return {
      academyName: 'Turf Cricket Academy',
      businessDateLabel: new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
      metrics: [
        { label: 'Active students', value: String(this.store.students().filter((item) => item.status === 'active').length), detail: `${this.store.activeEnrollmentRows().length} enrolled`, icon: 'pi-users', tone: 'green' },
        { label: 'Present today', value: String(attendance.length), detail: `${attendance.filter((item) => item.status === 'checked-out').length} checked out`, icon: 'pi-check-circle', tone: 'blue' },
        { label: 'Pending fees', value: inr(pendingPaise), detail: `${feeRows.filter((item) => item.balancePaise > 0).length} open charges`, icon: 'pi-wallet', tone: 'amber' },
        { label: 'Total coaches', value: String(this.store.coaches().filter((item) => item.status === 'active').length), detail: 'Active coaches', icon: 'pi-id-card', tone: 'violet' },
        { label: 'Active batches', value: String(this.store.batches().filter((item) => item.status !== 'completed').length), detail: 'Current batches', icon: 'pi-calendar', tone: 'amber' },
        { label: 'Total parents', value: String(this.store.parents().filter((item) => item.status !== 'inactive').length), detail: 'Active parent profiles', icon: 'pi-heart', tone: 'green' },
      ],
      checkIns: attendance.slice(-3).reverse().map((record) => {
        const studentName = this.store.students().find((item) => item.id === record.studentId)?.name ?? 'Unknown';
        return { id: record.id, studentName, initials: studentName.split(' ').map((part) => part[0]).join('').slice(0, 2), batchName: this.store.batches().find((item) => item.id === record.batchId)?.name ?? 'Unknown', checkedInAt: record.checkInAt, status: record.status === 'late' ? 'Late' as const : 'On time' as const };
      }),
      pendingFees: feeRows.filter((item) => item.balancePaise > 0).slice(0, 3).map((charge) => ({ id: charge.id, studentName: charge.studentName, batchName: charge.period, amountPaise: charge.balancePaise, dueLabel: `Due ${charge.dueDate}`, overdue: charge.status === 'Overdue' })),
    };
  });

  private readonly store = inject(AcademyStore);

  getSummary(): Observable<DashboardSummary> {
    return toObservable(this.summary).pipe(delay(150));
  }
}
