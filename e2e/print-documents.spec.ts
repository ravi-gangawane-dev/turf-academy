import { expect, Page, test } from '@playwright/test';
import { login } from './helpers';

interface PrintCapture {
  readonly html: string;
  readonly bodyPrinting: boolean;
  readonly hostDisplay: string;
  readonly sheetPage: string;
  readonly sheetMinHeight: string;
  readonly printMedia: boolean;
  readonly pageRules: readonly string[];
}

declare global {
  interface Window {
    __printCalls?: PrintCapture[];
  }
}

const invoiceRow = {
  id: 'charge-1',
  student: { full_name: 'Aarav Patil', student_code: 'TCA-STU-0001' },
  enrollment: { id: 'enrollment-1', batch: { name: 'Morning Elite' } },
  base_amount: 2500,
  discount_amount: 0,
  late_fee_amount: 100,
  final_amount: 2600,
  paid_amount: 0,
  balance_amount: 2600,
  due_date: '2026-08-05',
  charge_month: '2026-08',
  status: 'pending',
};

const paymentRow = {
  id: 'payment-1',
  studentId: 'student-1',
  studentName: 'Aarav Patil',
  studentCode: 'TCA-STU-0001',
  amountPaise: 125000,
  mode: 'upi',
  status: 'successful',
  paidAt: '2026-08-10T10:30:00+05:30',
  reference: 'UPI-8891',
  receiptId: 'receipt-1',
  receiptNumber: 'TCA-2026-00001',
  receiptPath: '',
  chargeId: 'charge-1',
  refundablePaise: 0,
};

const refundReceiptRecord = {
  id: 'refund-1',
  paymentId: 'payment-1',
  refundReceiptNumber: 'RFR-TCA202600001-EFUND1',
  originalReceiptNumber: 'TCA-2026-00001',
  studentName: 'Aarav Patil',
  studentCode: 'TCA-STU-0001',
  refundAmount: 500,
  originalAmount: 1250,
  paymentMode: 'UPI',
  refundedAt: '2026-08-15T10:30:00+05:30',
  paidAt: '2026-08-10T10:30:00+05:30',
  reason: 'Session cancelled',
  reference: 'UPI-8891',
  approvedBy: 'Academy Admin',
  batchName: 'Morning Elite',
  period: 'August 2026',
};

const attendanceRegister = {
  date: '2026-10-15',
  batchId: 'batch-1',
  batchCode: 'B-MOR',
  batchName: 'Morning Elite',
  batchTime: '06:30 – 08:00',
  coaches: ['Coach Rao'],
  rows: [
    {
      studentId: 'student-1',
      studentCode: 'TCA-STU-0001',
      studentName: 'Aarav Patil',
      status: 'present',
      checkInAt: '2026-10-15T01:00:00Z',
      checkOutAt: null,
      remarks: 'On time',
      source: 'manual',
    },
    {
      studentId: 'student-2',
      studentCode: 'TCA-STU-0002',
      studentName: 'Diya Patel',
      status: 'not_recorded',
      checkInAt: null,
      checkOutAt: null,
      remarks: null,
      source: null,
    },
  ],
  counts: {
    expected: 2,
    present: 1,
    late: 0,
    absent: 0,
    checkedOut: 0,
    notRecorded: 1,
  },
};

const attendanceMatrix = {
  month: '2026-10',
  monthLabel: 'October 2026',
  batchId: 'batch-1',
  batchCode: 'B-MOR',
  batchName: 'Morning Elite',
  batchTime: '06:30 – 08:00',
  schedule: 'Mon, Wed, Fri',
  coaches: ['Coach Rao'],
  days: [
    { date: '2026-10-05', day: 5, weekday: 'Mon', scheduled: true },
    { date: '2026-10-06', day: 6, weekday: 'Tue', scheduled: false },
    { date: '2026-10-07', day: 7, weekday: 'Wed', scheduled: true },
  ],
  rows: [
    {
      studentId: 'student-1',
      studentCode: 'TCA-STU-0001',
      studentName: 'Aarav Patil',
      cells: ['present', 'off', 'absent'],
      present: 1,
      late: 0,
      absent: 1,
      checkedOut: 0,
      recorded: 2,
      attended: 1,
      percentage: 50,
    },
  ],
};

const studentWorkspace = {
  student: {
    id: 'student-1',
    studentCode: 'TCA-STU-0001',
    status: 'active',
    fullName: 'Aarav Patil',
    dateOfBirth: '2012-04-18',
    gender: 'male',
    skillLevel: 'Intermediate',
    phone: '+91 98765 40001',
    email: 'aarav@example.com',
    address: 'Kharadi',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411014',
    joinedOn: '2025-06-01',
    photoUrl: null,
    bloodGroup: 'B+',
    nationality: 'Indian',
    aadhaar: null,
    batchId: 'batch-1',
    coachId: 'coach-1',
    parentName: 'Rohan Patil',
    parentRelation: 'Father',
    parentPhone: '+91 98765 40002',
    parentEmail: 'rohan@example.com',
  },
  enrollment: {
    id: 'enrollment-1',
    batch: { id: 'batch-1', code: 'B-MOR', name: 'Morning Elite' },
  },
  attendance: [],
  payments: [],
  documents: [],
  medical: null,
  attendanceTotal: 0,
  paymentTotal: 0,
  paymentAmount: 0,
  documentTotal: 0,
  attendanceSummary: { total: 0, present: 0, late: 0, absent: 0 },
};

const coachRecord = {
  id: 'coach-1',
  profile_id: null,
  employee_code: 'EMP-42',
  full_name: 'Coach Rao',
  phone: '+91 98765 43210',
  email: 'rao@example.com',
  date_of_birth: '1988-04-12',
  experience_years: 8,
  qualification: 'BCCI Level 2',
  biography: null,
  photo_path: null,
  photo_url: null,
  status: 'active',
  created_at: '2024-06-01T00:00:00Z',
  coach_specializations: [{ specialization: 'Batting' }, { specialization: 'Fielding' }],
  batch_coaches: [
    {
      is_primary: true,
      batch: {
        id: 'batch-1',
        code: 'B-MOR',
        name: 'Morning Elite',
        age_group: 'U-14',
        skill_level: 'Intermediate',
        start_time: '06:30:00',
        end_time: '08:00:00',
        status: 'active',
      },
    },
  ],
};

const parentChild = {
  link: { is_primary: true, can_pick_up: true, student: { id: 'student-1' } },
  workspace: {
    student: {
      id: 'student-1',
      studentCode: 'TCA-STU-0001',
      fullName: 'Aarav Patil',
    },
    enrollment: {
      id: 'enrollment-1',
      batch_id: 'batch-1',
      batch: { id: 'batch-1', name: 'Morning Elite' },
    },
    attendance: [],
    payments: [],
    documents: [],
    medical: null,
    attendanceTotal: 0,
    paymentTotal: 0,
    paymentAmount: 0,
    documentTotal: 0,
    attendanceSummary: { total: 0, present: 0, late: 0, absent: 0 },
  },
};

const parentData = {
  parent: { id: 'parent-1', full_name: 'Rohan Patil' },
  children: [parentChild],
  selected: parentChild,
  charges: [],
  notifications: [],
  batchDays: [],
  coaches: [],
  sessions: [],
  attendancePage: { rows: [], total: 0 },
  paymentPage: { rows: [], total: 0 },
  notificationPage: { rows: [], total: 0 },
};

const parentReceipts = {
  'payment-1': {
    id: 'payment-1',
    amount: 1250,
    payment_mode: 'upi',
    paid_at: '2026-08-10T10:30:00+05:30',
    status: 'successful',
    provider_reference: 'UPI-8891',
    receipt: { receipt_number: 'TCA-2026-00001' },
    monthly_charge: { charge_month: '2026-08' },
  },
  'payment-2': {
    id: 'payment-2',
    amount: 500,
    payment_mode: 'cash',
    paid_at: '2026-09-01T14:15:00+05:30',
    status: 'successful',
    client_reference: 'CASH-2210',
    receipt: { receipt_number: 'TCA-2026-00002' },
    monthly_charge: { charge_month: '2026-09' },
  },
};

const parentDetail = {
  id: 'parent-1',
  profile_id: null,
  full_name: 'Rohan Patil',
  relation: 'Father',
  phone: '+91 98765 40002',
  whatsapp: '+91 98765 40003',
  email: 'rohan@example.com',
  occupation: 'Engineer',
  address: { formatted: 'Kharadi, Pune' },
  communication_preferences: { channel: 'whatsapp' },
  status: 'active',
  photo_path: null,
  photo_url: null,
  created_at: '2026-01-05T00:00:00Z',
  student_parents: [
    {
      is_primary: true,
      can_pick_up: true,
      student: {
        id: 'student-1',
        student_code: 'TCA-STU-0001',
        full_name: 'Aarav Patil',
        date_of_birth: '2014-02-01',
        phone: null,
        status: 'active',
        photo_path: null,
      },
    },
    {
      is_primary: false,
      can_pick_up: false,
      student: {
        id: 'student-2',
        student_code: 'TCA-STU-0002',
        full_name: 'Diya Patel',
        date_of_birth: '2015-06-12',
        phone: null,
        status: 'active',
        photo_path: null,
      },
    },
  ],
};

const rosterBatch = {
  id: 'batch-1',
  code: 'B-MOR',
  name: 'Morning Elite',
  age_group: 'Under 14',
  skill_level: 'Intermediate',
  capacity: 20,
  waitlist_capacity: 0,
  start_date: '2026-11-01',
  end_date: '2027-03-31',
  start_time: '06:30:00',
  end_time: '08:00:00',
  fee_plan_id: 'plan-1',
  status: 'active',
  description: null,
  batch_days: [{ day_of_week: 5 }, { day_of_week: 1 }, { day_of_week: 3 }],
  batch_coaches: [{ coach_id: 'coach-1', is_primary: true }],
};

const batchRosterRecord = {
  batch: {
    id: 'batch-1',
    code: 'B-MOR',
    name: 'Morning Elite',
    age_group: 'Under 14',
    skill_level: 'Intermediate',
    capacity: 20,
    start_date: '2026-11-01',
    end_date: '2027-03-31',
    start_time: '06:30:00',
    end_time: '08:00:00',
    status: 'active',
    batch_days: [{ day_of_week: 5 }, { day_of_week: 1 }, { day_of_week: 3 }],
    batch_coaches: [{ coach: { full_name: 'Coach Rao' } }],
  },
  coaches: ['Coach Rao'],
  rows: [
    {
      studentId: 'student-1',
      studentCode: 'TCA-STU-0001',
      studentName: 'Aarav Patil',
      dateOfBirth: '2014-02-01',
      status: 'active',
      guardians: [
        {
          name: 'Rohan Patil',
          relation: 'Father',
          phone: '+91 98765 40002',
          whatsapp: '+91 98765 40003',
          isPrimary: true,
          canPickUp: true,
        },
        {
          name: 'Neha Patil',
          relation: 'Mother',
          phone: '+91 98765 40004',
          whatsapp: null,
          isPrimary: false,
          canPickUp: false,
        },
      ],
      medical: 'Blood group B+ · Allergies: None',
    },
    {
      studentId: 'student-2',
      studentCode: 'TCA-STU-0002',
      studentName: 'Diya Patel',
      dateOfBirth: '2015-06-12',
      status: 'active',
      guardians: [],
      medical: null,
    },
  ],
};

const enrollmentConfirmationRecord = {
  enrollment: {
    id: 'enrollment-1',
    student_id: 'student-1',
    batch_id: 'batch-1',
    fee_plan_id: 'plan-1',
    status: 'active',
    valid_from: '2026-11-03',
    valid_till: '2027-02-02',
    monthly_fee: 4500,
    notes: 'Confirmed at reception',
  },
  student: {
    id: 'student-1',
    student_code: 'TCA-STU-0001',
    full_name: 'Aarav Patil',
    date_of_birth: '2014-02-01',
    phone: null,
    status: 'active',
  },
  batch: {
    id: 'batch-1',
    code: 'B-MOR',
    name: 'Morning Elite',
    age_group: 'Under 14',
    skill_level: 'Intermediate',
    start_date: '2026-11-01',
    end_date: '2027-03-31',
    start_time: '06:30:00',
    end_time: '08:00:00',
    status: 'active',
    capacity: 20,
    batch_days: [{ day_of_week: 5 }, { day_of_week: 1 }, { day_of_week: 3 }],
    batch_coaches: [{ coach: { full_name: 'Coach Rao' } }],
  },
  plan: {
    id: 'plan-1',
    name: 'Quarterly Training',
    monthly_fee: 4500,
    registration_fee: 1000,
    duration_months: 3,
    status: 'active',
  },
  guardians: [
    {
      id: 'guardian-1',
      full_name: 'Rohan Patil',
      relation: 'Father',
      phone: '+91 98765 40002',
      whatsapp: null,
      email: 'rohan@example.com',
      is_primary: true,
      can_pick_up: true,
    },
  ],
  previousBatch: null,
};

const statementRecord = {
  statementNumber: 'FES-TCASTU0001-20260401-20260430',
  fromDate: '2026-04-01',
  toDate: '2026-04-30',
  studentName: 'Aarav Patil',
  studentCode: 'TCA-STU-0001',
  batchName: 'Morning Elite',
  openingBalance: 1000,
  closingBalance: 1500,
  totalCharges: 2500,
  totalPayments: 2500,
  totalRefunds: 500,
  lines: [
    {
      date: '2026-04-05',
      type: 'charge',
      description: 'Monthly fee — April 2026 · Morning Elite',
      reference: 'INV-CHARGE1',
      debit: 2500,
      credit: 0,
      balance: 3500,
    },
    {
      date: '2026-04-10T10:30:00+05:30',
      type: 'payment',
      description: 'Payment received — UPI',
      reference: 'TCA-2026-00001',
      debit: 0,
      credit: 2500,
      balance: 1000,
    },
    {
      date: '2026-04-15T10:30:00+05:30',
      type: 'refund',
      description: 'Refund — Session cancelled',
      reference: 'REF-REFUND1',
      debit: 500,
      credit: 0,
      balance: 1500,
    },
  ],
  ageing: [
    { label: 'Not due', amount: 0 },
    { label: '1–30 days', amount: 0 },
    { label: '31–60 days', amount: 0 },
    { label: '61–90 days', amount: 0 },
    { label: 'Over 90 days', amount: 3500 },
  ],
};

/** Capture the document while `window.print()` is on the stack, before the host is cleared. */
async function capturePrintMedia(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__printCalls = [];
    window.print = () => {
      const host = document.querySelector('app-print-document-host');
      const sheet = host?.querySelector('.print-sheet');
      const pageRules: string[] = [];
      for (const styleSheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(styleSheet.cssRules)) {
            if (rule instanceof CSSPageRule) pageRules.push(rule.cssText);
          }
        } catch {
          // A cross-origin sheet cannot be inspected; the print CSS is same-origin.
        }
      }
      window.__printCalls!.push({
        html: host?.innerHTML ?? '',
        bodyPrinting: document.body.classList.contains('printing-document'),
        hostDisplay: host ? getComputedStyle(host).display : '',
        sheetPage: sheet ? getComputedStyle(sheet).page : '',
        sheetMinHeight: sheet ? getComputedStyle(sheet).minHeight : '',
        printMedia: matchMedia('print').matches,
        pageRules,
      });
    };
  });
}

async function printCalls(page: Page): Promise<readonly PrintCapture[]> {
  return page.evaluate(() => window.__printCalls ?? []);
}

async function lastPrint(page: Page): Promise<PrintCapture> {
  await expect.poll(async () => (await printCalls(page)).length).toBeGreaterThan(0);
  const calls = await printCalls(page);
  return calls[calls.length - 1]!;
}

test.describe('print documents', () => {
  test.beforeEach(async ({ page }) => {
    await capturePrintMedia(page);
    await page.emulateMedia({ media: 'print' });
  });

  test('fee invoice prints one A4 sheet with settings branding', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/fees');
    await expect(page.locator('app-fees-page')).toBeVisible();

    await page.evaluate(async (invoice) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-fees-page'));
      const invoiceDocument = component['invoiceDocument'](invoice);
      await component['printDocuments'].printInvoice(invoiceDocument, 'print');
    }, invoiceRow);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('invoice-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--invoice');
    expect(capture.html).toContain('INV-CHARGE-1');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('Morning Elite');
    expect(capture.html).toContain('Late payment fee');
    expect(capture.html).not.toContain('print-sheet--receipt');
    expect(capture.pageRules.join('\n')).toContain('@page invoice-page');
    // Chromium normalises `A4 portrait` to `a4` in the CSSOM.
    expect(capture.pageRules.join('\n')).toMatch(/invoice-page[^}]*size:\s*a4/i);
    expect(capture.pageRules.join('\n')).toMatch(/receipt-page[^}]*size:\s*a5/i);
  });

  test('fee statement prints an A4 ledger with opening and closing balances', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/fees');
    await expect(page.locator('app-fees-page')).toBeVisible();

    await page.evaluate(async (statement) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-fees-page'));
      component['statementStudent'].set({
        id: 'charge-1',
        studentId: 'student-1',
        enrollmentId: 'enrollment-1',
        studentName: 'Aarav Patil',
        batchId: 'batch-1',
        batchName: 'Morning Elite',
        planName: 'Monthly cricket',
        period: '2026-04',
        amountPaise: 250000,
        paidPaise: 0,
        balancePaise: 250000,
        dueDate: '2026-04-05',
        status: 'Pending',
      });
      component['statementForm'].setValue({ fromDate: '2026-04-01', toDate: '2026-04-30' });
      // Stub only the Supabase query; dialog, mapping and the print pipeline stay real.
      component['feesApi'].statement = async () => statement;
      await component['printStatement']('print');
    }, statementRecord);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('statement-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--statement');
    expect(capture.html).toContain('FES-TCASTU0001-20260401-20260430');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('Opening balance');
    expect(capture.html).toContain('Monthly fee — April 2026 · Morning Elite');
    expect(capture.html).toContain('TCA-2026-00001');
    expect(capture.html).toContain('Session cancelled');
    expect(capture.html).toContain('Closing balance');
    expect(capture.html).toContain('Outstanding ageing');
    expect(capture.html).not.toContain('print-sheet--invoice');
    expect(capture.html).not.toContain('print-sheet--receipt');
    expect(capture.pageRules.join('\n')).toContain('@page statement-page');
    expect(capture.pageRules.join('\n')).toMatch(/statement-page[^}]*size:\s*a4/i);
  });

  test('payment receipt prints one A5 sheet through the page action', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/payments');
    await expect(page.locator('app-payments-page')).toBeVisible();

    await page.evaluate(async (row) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-payments-page'));
      await component['printReceipt'](row, 'print');
    }, paymentRow);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('receipt-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--receipt');
    expect(capture.html).toContain('TCA-2026-00001');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('UPI-8891');
    expect(capture.html).toContain('One thousand two hundred fifty rupees only');
    expect(capture.html).not.toContain('print-sheet--invoice');
  });

  test('preview shows the document before printing and prints from the overlay', async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ media: 'screen' });
    await login(page);
    await page.goto('/payments');
    await expect(page.locator('app-payments-page')).toBeVisible();

    await page.evaluate(async (row) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-payments-page'));
      await component['printReceipt'](row, 'preview');
    }, paymentRow);

    const preview = page.locator('app-print-preview .preview-panel');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Payment receipt');
    await expect(preview).toContainText('Print preview · A5');
    await expect(preview.locator('.print-sheet--receipt')).toBeVisible();
    await expect(preview).toContainText('TCA-2026-00001');
    expect(await printCalls(page)).toHaveLength(0);

    await preview.getByRole('button', { name: 'Print', exact: true }).click();

    const capture = await lastPrint(page);
    expect(capture.html).toContain('print-sheet--receipt');
    expect(capture.html).toContain('TCA-2026-00001');
    await expect(preview).toHaveCount(0);
  });

  test('refund receipt prints one A5 sheet linked to the original receipt', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/payments');
    await expect(page.locator('app-payments-page')).toBeVisible();

    await page.evaluate(async ({ row, refund }) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-payments-page'));
      // Stub only the Supabase query; the dialog state, mapping and print pipeline stay real.
      component['paymentsApi'].refundReceipts = async () => [refund];
      await component['openRefundReceipt'](row);
      await component['printRefundReceipt'](component['refundReceipts']()[0], 'print');
    }, { row: paymentRow, refund: refundReceiptRecord });

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('refund-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--refund');
    expect(capture.html).toContain('RFR-TCA202600001-EFUND1');
    expect(capture.html).toContain('TCA-2026-00001');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('Session cancelled');
    expect(capture.html).toContain('Academy Admin');
    expect(capture.html).toContain('UPI-8891');
    expect(capture.html).toContain('500.00');
    expect(capture.html).not.toContain('print-sheet--receipt');
    expect(capture.html).not.toContain('print-sheet--invoice');
    expect(capture.pageRules.join('\n')).toContain('@page refund-page');
    expect(capture.pageRules.join('\n')).toMatch(/refund-page[^}]*size:\s*a5/i);
  });

  test('daily attendance register prints one A4 sheet with the full roster', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/attendance/history');
    await expect(page.locator('app-attendance-history-page')).toBeVisible();

    await page.evaluate(async (register) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-attendance-history-page'));
      // Stub only the Supabase query; dialog state, mapping and print pipeline stay real.
      component['attendance'].register = async () => register;
      component['openRegister']();
      component['registerBatchId'].set('batch-1');
      component['registerDate'].set('2026-10-15');
      component['registerIncludeRemarks'].set(true);
      await component['printRegister']('print');
    }, attendanceRegister);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('attendance-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--attendance');
    expect(capture.html).toContain('Daily Attendance Register');
    expect(capture.html).toContain('ATR-BMOR-20261015');
    expect(capture.html).toContain('Morning Elite');
    expect(capture.html).toContain('Coach Rao');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('Diya Patel');
    expect(capture.html).toContain('Not recorded');
    expect(capture.html).toContain('On time');
    expect(capture.html).not.toContain('print-sheet--invoice');
    expect(capture.html).not.toContain('print-sheet--receipt');
    expect(capture.pageRules.join('\n')).toContain('@page attendance-page');
    expect(capture.pageRules.join('\n')).toMatch(/attendance-page[^}]*size:\s*a4/i);
  });

  test('monthly attendance matrix prints one A4 landscape grid with P/L/A totals', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/attendance/history');
    await expect(page.locator('app-attendance-history-page')).toBeVisible();

    await page.evaluate(async (matrix) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-attendance-history-page'));
      // Stub only the Supabase query; dialog state, mapping and print pipeline stay real.
      component['attendance'].matrix = async () => matrix;
      component['openMatrix']();
      component['matrixBatchId'].set('batch-1');
      component['matrixMonth'].set('2026-10');
      await component['printMatrix']('print');
    }, attendanceMatrix);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('attendance-matrix-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--attendance-matrix');
    expect(capture.html).toContain('Monthly Attendance Matrix');
    expect(capture.html).toContain('ATM-BMOR-202610');
    expect(capture.html).toContain('Morning Elite');
    expect(capture.html).toContain('Mon, Wed, Fri');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('matrix-cell--present');
    expect(capture.html).toContain('matrix-cell--off');
    expect(capture.html).toContain('matrix-cell--absent');
    expect(capture.html).toContain('50%');
    expect(capture.html).not.toContain('Daily Attendance Register');
    expect(capture.html).not.toContain('print-sheet--invoice');
    expect(capture.pageRules.join('\n')).toContain('@page attendance-matrix-page');
    expect(capture.pageRules.join('\n')).toMatch(/attendance-matrix-page[^}]*size:\s*a4/i);
    expect(capture.pageRules.join('\n')).toMatch(/attendance-matrix-page[^}]*landscape/i);
  });

  test('student and coach ID cards print CR80 duplex sheets with scannable QR codes', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/students/student-1');
    await expect(page.locator('app-student-details-page')).toBeVisible();

    await page.evaluate(async (workspace) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-student-details-page'));
      // Stub only the Supabase queries; card mapping, dialog and print pipeline stay real.
      component['students'].getStudentWorkspace = async () => workspace;
      component['students'].detailPage = async () => ({ rows: [], total: 0 });
      await component['load']('student-1');
      component['openIdCard']();
      await component['printIdCard']('print');
    }, studentWorkspace);

    const student = await lastPrint(page);
    expect(student.printMedia).toBe(true);
    expect(student.bodyPrinting).toBe(true);
    expect(student.hostDisplay).toBe('block');
    expect(student.sheetPage).toBe('id-card-page');
    expect(student.html).toContain('print-sheet--id-card');
    expect((student.html.match(/id-card-sheet/g) ?? []).length).toBe(2);
    expect((student.html.match(/id-card--front/g) ?? []).length).toBe(2);
    expect((student.html.match(/id-card--back/g) ?? []).length).toBe(2);
    expect((student.html.match(/class="crop /g) ?? []).length).toBe(16);
    expect(student.html).toContain('Student ID');
    expect(student.html).toContain('Aarav Patil');
    expect(student.html).toContain('TCA-STU-0001');
    expect(student.html).toContain('Morning Elite · B-MOR');
    expect(student.html).toContain('ID-STU-TCASTU0001');
    expect(student.html).toContain('Rohan Patil (Father)');
    expect(student.html).toContain('Valid while actively enrolled');
    expect(student.html).toContain('data:image/png;base64,');
    expect(student.html).toContain('TCA:student-1');
    expect(student.html).not.toContain('print-sheet--invoice');
    expect(student.html).not.toContain('print-sheet--receipt');
    expect(student.pageRules.join('\n')).toContain('@page id-card-page');
    expect(student.pageRules.join('\n')).toMatch(/id-card-page[^}]*size:\s*a4/i);
    expect(student.pageRules.join('\n')).toMatch(/id-card-page[^}]*margin:\s*0/i);

    await page.goto('/coaches/coach-1');
    await expect(page.locator('app-coach-details-page')).toBeVisible();

    await page.evaluate(async (coach) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-coach-details-page'));
      // Stub only the Supabase query; card mapping, dialog and print pipeline stay real.
      component['coaches'].getById = async () => coach;
      await component['ngOnInit']();
      component['openIdCard']();
      await component['printIdCard']('print');
    }, coachRecord);

    const coach = await lastPrint(page);
    expect(coach.printMedia).toBe(true);
    expect(coach.bodyPrinting).toBe(true);
    expect(coach.hostDisplay).toBe('block');
    expect(coach.sheetPage).toBe('id-card-page');
    expect(coach.html).toContain('print-sheet--id-card');
    expect((coach.html.match(/id-card-sheet/g) ?? []).length).toBe(2);
    expect((coach.html.match(/id-card--front/g) ?? []).length).toBe(2);
    expect((coach.html.match(/id-card--back/g) ?? []).length).toBe(2);
    expect(coach.html).toContain('Coach ID');
    expect(coach.html).toContain('Coach Rao');
    expect(coach.html).toContain('EMP-42');
    expect(coach.html).toContain('ID-COA-EMP42');
    expect(coach.html).toContain('Batting, Fielding');
    expect(coach.html).toContain('BCCI Level 2');
    expect(coach.html).toContain('Morning Elite');
    expect(coach.html).toContain('Valid while employed at the academy');
    expect(coach.html).toContain('TCA:coach:coach-1');
    expect(coach.html).not.toContain('TCA:student-1');
    expect(coach.pageRules.join('\n')).toContain('@page id-card-page');
  });

  test('each parent receipt query prints only the selected payment', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'parent@turf.local');
    await page.goto('/parent/receipts');
    await expect(page.locator('app-parent-portal-page')).toBeVisible();

    await page.evaluate(({ data, receipts }) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-parent-portal-page'));
      component['data'].set(data);
      // Stub only the Supabase-backed lookup; router, query subscription and the
      // receipt-to-document mapping all stay real.
      component['portal'].payment = async (id: string) =>
        (receipts as Record<string, unknown>)[id] ?? null;
    }, { data: parentData, receipts: parentReceipts });

    const printFor = async (paymentId: string): Promise<PrintCapture> => {
      await page.evaluate(async (id) => {
        const ng = (window as unknown as { ng: any }).ng;
        const component = ng.getComponent(document.querySelector('app-parent-portal-page'));
        await component['router'].navigate(['/parent/receipts'], { queryParams: { payment: id } });
        for (let attempt = 0; attempt < 100; attempt++) {
          if (component['selectedReceipt']()?.id === id) break;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        await component['printReceipt']('print');
      }, paymentId);
      return lastPrint(page);
    };

    const first = await printFor('payment-1');
    expect(new URL(page.url()).searchParams.get('payment')).toBe('payment-1');
    expect(await printCalls(page)).toHaveLength(1);
    expect(first.bodyPrinting).toBe(true);
    expect(first.html).toContain('TCA-2026-00001');
    expect(first.html).toContain('Rohan Patil');
    expect(first.html).toContain('August 2026');
    expect(first.html).not.toContain('TCA-2026-00002');
    expect(first.html).not.toContain('500.00');

    const second = await printFor('payment-2');
    expect(new URL(page.url()).searchParams.get('payment')).toBe('payment-2');
    expect(await printCalls(page)).toHaveLength(2);
    expect(second.bodyPrinting).toBe(true);
    expect(second.html).toContain('TCA-2026-00002');
    expect(second.html).toContain('September 2026');
    expect(second.html).toContain('CASH-2210');
    expect(second.html).not.toContain('TCA-2026-00001');
    expect(second.html).not.toContain('1,250.00');
  });

  test('guardian card prints children, pickup rights and the revocation note', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/parents/parent-1');
    await expect(page.locator('app-parent-details-page')).toBeVisible();

    await page.evaluate(async (parent) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-parent-details-page'));
      // Stub only the Supabase read; card mapping, dialog and print pipeline stay real.
      component['parents'].getById = async () => parent;
      await component['ngOnInit']();
      component['openIdCard']();
      await component['printIdCard']('print');
    }, parentDetail);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('id-card-page');
    expect(capture.html).toContain('print-sheet--id-card');
    expect((capture.html.match(/id-card-sheet/g) ?? []).length).toBe(2);
    expect(capture.html).toContain('Guardian ID');
    expect(capture.html).toContain('Rohan Patil');
    expect(capture.html).toContain('ID-PAR-PARENT1');
    expect(capture.html).toContain('Father');
    expect(capture.html).toContain('Aarav Patil (TCA-STU-0001)');
    expect(capture.html).toContain('Diya Patel (TCA-STU-0002)');
    expect(capture.html).toContain('Aarav Patil: authorised');
    expect(capture.html).toContain('Diya Patel: not authorised');
    expect(capture.html).toContain('Report a lost card to the academy');
    expect(capture.html).toContain('revoke if lost');
    expect(capture.html).toContain('TCA:parent:parent-1');
    expect(capture.html).not.toContain('TCA:student-1');
    expect(capture.html).toContain('data:image/png;base64,');
    expect(capture.pageRules.join('\n')).toContain('@page id-card-page');
    expect(capture.pageRules.join('\n')).toMatch(/id-card-page[^}]*margin:\s*0/i);
  });

  test('enrollment confirmation prints the live student, batch, plan and terms', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/enrollments');
    await expect(page.locator('app-enrollments-page')).toBeVisible();

    await page.evaluate(async (record) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-enrollments-page'));
      // Stub only the Supabase read; confirmation mapping, dialog and print pipeline stay real.
      component['api'].confirmation = async () => record;
      component['beginConfirmation']('enrollment-1', 'created', '');
      for (let attempt = 0; attempt < 100; attempt++) {
        if (component['confirmation']()) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await component['prepareConfirmation']('print');
    }, enrollmentConfirmationRecord);

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('enrollment-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--enrollment');
    expect(capture.html).toContain('Enrollment Confirmation');
    expect(capture.html).toContain('ENR-TCASTU0001');
    expect(capture.html).toContain('Aarav Patil');
    expect(capture.html).toContain('TCA-STU-0001');
    expect(capture.html).toContain('Rohan Patil');
    expect(capture.html).toContain('Morning Elite');
    expect(capture.html).toContain('B-MOR');
    expect(capture.html).toContain('Mon, Wed, Fri');
    expect(capture.html).toContain('06:30 – 08:00');
    expect(capture.html).toContain('Coach Rao');
    expect(capture.html).toContain('Quarterly Training');
    expect(capture.html).toContain('Enrollment status');
    expect(capture.html).toContain('Student / guardian signature');
    expect(capture.html).toContain('Academy representative');
    expect(capture.html).not.toContain('print-sheet--roster');
    expect(capture.pageRules.join('\n')).toContain('@page enrollment-page');
    expect(capture.pageRules.join('\n')).toMatch(/enrollment-page[^}]*size:\s*a4/i);
  });

  test('batch roster prints guardian contacts and permission-gated medical notes', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto('/batches');
    await expect(page.locator('app-batches-page')).toBeVisible();

    await page.evaluate(async ({ batch, record }) => {
      const ng = (window as unknown as { ng: any }).ng;
      const component = ng.getComponent(document.querySelector('app-batches-page'));
      // Stub only the Supabase reads; roster mapping, dialog and print pipeline stay real.
      component['rosterService'].roster = async () => record;
      component['openRoster'](batch);
      component['rosterIncludeMedical'].set(true);
      await component['printRoster']('print');
    }, { batch: rosterBatch, record: batchRosterRecord });

    const capture = await lastPrint(page);
    expect(capture.printMedia).toBe(true);
    expect(capture.bodyPrinting).toBe(true);
    expect(capture.hostDisplay).toBe('block');
    expect(capture.sheetPage).toBe('roster-page');
    expect(capture.sheetMinHeight).not.toBe('auto');
    expect(capture.html).toContain('print-sheet--roster');
    expect(capture.html).toContain('Batch Roster');
    expect(capture.html).toContain('RST-BMOR');
    expect(capture.html).toContain('Morning Elite');
    expect(capture.html).toContain('B-MOR');
    expect(capture.html).toContain('Under 14');
    expect(capture.html).toContain('Intermediate');
    expect(capture.html).toContain('2 of 20 places filled');
    expect(capture.html).toContain('Mon, Wed, Fri');
    expect(capture.html).toContain('06:30 – 08:00');
    expect(capture.html).toContain('Coach Rao');
    expect(capture.html).toContain('Medical notes are included');
    expect(capture.html).toContain('Rohan Patil');
    expect(capture.html).toContain('(Father)');
    expect(capture.html).toContain('Primary');
    expect(capture.html).toContain('+91 98765 40002');
    expect(capture.html).toContain('WhatsApp +91 98765 40003');
    expect(capture.html).toContain('Rohan Patil: Authorised for pickup');
    expect(capture.html).toContain('Neha Patil: Not authorised for pickup');
    expect(capture.html).toContain('Blood group B+');
    expect(capture.html).toContain('No guardian linked');
    expect(capture.html).toContain('No medical notes recorded');
    expect(capture.html).not.toContain('print-sheet--enrollment');
    expect(capture.pageRules.join('\n')).toContain('@page roster-page');
    expect(capture.pageRules.join('\n')).toMatch(/roster-page[^}]*size:\s*a4/i);
  });
});
