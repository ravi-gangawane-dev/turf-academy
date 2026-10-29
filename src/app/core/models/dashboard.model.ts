export interface DashboardMetric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly icon: string;
  readonly tone: 'green' | 'blue' | 'amber' | 'violet';
}

export interface RecentCheckIn {
  readonly id: string;
  readonly studentName: string;
  readonly initials: string;
  readonly batchName: string;
  readonly checkedInAt: string;
  readonly status: 'On time' | 'Late';
}

export interface PendingFee {
  readonly id: string;
  readonly studentName: string;
  readonly batchName: string;
  readonly amountPaise: number;
  readonly dueLabel: string;
  readonly overdue: boolean;
}

export interface DashboardSummary {
  readonly attendanceTrend?: readonly { day: string; count: number }[];
  readonly collectionTrend?: readonly { month: string; amount: number }[];
  readonly academyName: string;
  readonly businessDateLabel: string;
  readonly metrics: readonly DashboardMetric[];
  readonly checkIns: readonly RecentCheckIn[];
  readonly pendingFees: readonly PendingFee[];
}
