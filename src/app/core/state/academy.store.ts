import { computed, inject, Injectable, signal } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import {
  AttendanceRecord,
  Batch,
  Coach,
  Enrollment,
  FeeCharge,
  Parent,
  Payment,
  PaymentMode,
  NotificationLog,
  QrIdentity,
  ReportDataset,
  ReportType,
  Student,
  StudentRegistration,
} from '../models/academy.model';
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date());




@Injectable({ providedIn: 'root' })
export class AcademyStore {
  private readonly config = inject(API_CONFIG);
  private sequence = 100;
  private readonly parentsState = signal<readonly Parent[]>(this.config.useMockApi ? [
    {
      id: 'parent-1',
      name: 'Mahesh Patil',
      mobile: '9876543210',
      whatsapp: '9876543210',
      relation: 'Father',
    },
    {
      id: 'parent-2',
      name: 'Neha Shah',
      mobile: '9822012345',
      whatsapp: '9822012345',
      relation: 'Mother',
    },
    {
      id: 'parent-3',
      name: 'Pooja Singh',
      mobile: '9988776655',
      whatsapp: '9988776655',
      relation: 'Mother',
    },
    {
      id: 'parent-4',
      name: 'Sandeep Rai',
      mobile: '9701234560',
      whatsapp: '9701234560',
      relation: 'Father',
    },
    {
      id: 'parent-5',
      name: 'Amit Mehta',
      mobile: '9008765432',
      whatsapp: '9008765432',
      relation: 'Father',
    },
    {
      id: 'parent-6',
      name: 'Nitin Gupta',
      mobile: '8887654321',
      whatsapp: '8887654321',
      relation: 'Father',
    },
    {
      id: 'parent-7',
      name: 'Nilesh Joshi',
      mobile: '9176543210',
      whatsapp: '9176543210',
      relation: 'Father',
    },
    {
      id: 'parent-8',
      name: 'Manoj Verma',
      mobile: '9345678001',
      whatsapp: '9345678001',
      relation: 'Father',
    },
    {
      id: 'parent-9',
      name: 'Vijay Sharma',
      mobile: '9871234560',
      whatsapp: '9871234560',
      relation: 'Father',
    },
    {
      id: 'parent-10',
      name: 'Pankaj Malhotra',
      mobile: '9001234567',
      whatsapp: '9001234567',
      relation: 'Father',
    },
  ] : []);
  private readonly studentsState = signal<readonly Student[]>(this.config.useMockApi ? [
    {
      id: 'student-1',
      parentId: 'parent-1',
      name: 'Rohan Patil',
      dateOfBirth: '2012-05-14',
      skillLevel: 'Intermediate',
      status: 'active',
    },
    {
      id: 'student-2',
      parentId: 'parent-2',
      name: 'Aarav Shah',
      dateOfBirth: '2013-09-03',
      skillLevel: 'Beginner',
      status: 'active',
    },
    {
      id: 'student-3',
      parentId: 'parent-3',
      name: 'Vihaan Singh',
      dateOfBirth: '2008-01-10',
      skillLevel: 'Advanced',
      status: 'active',
    },
    {
      id: 'student-4',
      parentId: 'parent-4',
      name: 'Aditya Rai',
      dateOfBirth: '2008-02-07',
      skillLevel: 'Intermediate',
      status: 'active',
    },
    {
      id: 'student-5',
      parentId: 'parent-5',
      name: 'Rohan Mehta',
      dateOfBirth: '2012-03-30',
      skillLevel: 'Beginner',
      status: 'active',
    },
    {
      id: 'student-6',
      parentId: 'parent-6',
      name: 'Reyansh Gupta',
      dateOfBirth: '2009-07-18',
      skillLevel: 'Intermediate',
      status: 'inactive',
    },
    {
      id: 'student-7',
      parentId: 'parent-7',
      name: 'Aarav Joshi',
      dateOfBirth: '2008-04-05',
      skillLevel: 'Advanced',
      status: 'active',
    },
    {
      id: 'student-8',
      parentId: 'parent-8',
      name: 'Dhruv Verma',
      dateOfBirth: '2012-11-21',
      skillLevel: 'Beginner',
      status: 'active',
    },
    {
      id: 'student-9',
      parentId: 'parent-9',
      name: 'Meher Sharma',
      dateOfBirth: '2009-12-12',
      skillLevel: 'Intermediate',
      status: 'active',
    },
    {
      id: 'student-10',
      parentId: 'parent-10',
      name: 'Vihaan Malhotra',
      dateOfBirth: '2008-09-09',
      skillLevel: 'Advanced',
      status: 'inactive',
    },
    {
      id: 'qa-camera-student',
      parentId: 'parent-1',
      name: 'QA Camera Test Student',
      dateOfBirth: '2012-05-14',
      skillLevel: 'Beginner',
      status: 'active',
    },
  ] : []);
  private readonly batchesState = signal<readonly Batch[]>(this.config.useMockApi ? [
    {
      id: 'batch-1',
      name: 'Morning Pro',
      schedule: 'Mon–Sat · 6:00–8:00 AM',
      capacity: 25,
      monthlyFeePaise: 250000,
      coachId: 'coach-1',
    },
    {
      id: 'batch-2',
      name: 'Evening Elite',
      schedule: 'Mon–Sat · 5:00–7:00 PM',
      capacity: 25,
      monthlyFeePaise: 250000,
      coachId: 'coach-2',
    },
    {
      id: 'batch-3',
      name: 'Foundation',
      schedule: 'Mon/Wed/Fri · 4:00–5:30 PM',
      capacity: 18,
      monthlyFeePaise: 200000,
    },
  ] : []);
  private readonly coachesState = signal<readonly Coach[]>(this.config.useMockApi ? [
    {
      id: 'coach-1',
      name: 'Rahul Deshmukh',
      mobile: '9822133445',
      specialization: 'Batting Coach',
      status: 'active',
    },
    {
      id: 'coach-2',
      name: 'Amit Patil',
      mobile: '9765432108',
      specialization: 'Bowling Coach',
      status: 'active',
    },
    {
      id: 'coach-3',
      name: 'Sandeep Joshi',
      mobile: '8888811223',
      specialization: 'Fielding Coach',
      status: 'active',
    },
    {
      id: 'coach-4',
      name: 'Vikram Singh',
      mobile: '9090944556',
      specialization: 'Fitness Coach',
      status: 'active',
    },
    {
      id: 'coach-5',
      name: 'Nilesh More',
      mobile: '7770088990',
      specialization: 'Wicket Keeping Coach',
      status: 'inactive',
    },
    {
      id: 'coach-6',
      name: 'Pravin Jadhav',
      mobile: '9898966554',
      specialization: 'Spin Bowling Coach',
      status: 'active',
    },
  ] : []);
  private readonly enrollmentsState = signal<readonly Enrollment[]>(this.config.useMockApi ? [
    {
      id: 'enrollment-1',
      studentId: 'student-1',
      batchId: 'batch-2',
      startDate: '2026-08-01',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'active',
    },
    {
      id: 'enrollment-qa-camera',
      studentId: 'qa-camera-student',
      batchId: 'batch-1',
      startDate: '2026-10-14',
      dueDate: '2026-10-14',
      monthlyFeePaise: 250000,
      status: 'active',
    },
    {
      id: 'enrollment-3',
      studentId: 'student-3',
      batchId: 'batch-1',
      startDate: '2025-06-12',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'active',
    },
    {
      id: 'enrollment-4',
      studentId: 'student-4',
      batchId: 'batch-1',
      startDate: '2025-07-10',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'active',
    },
    {
      id: 'enrollment-5',
      studentId: 'student-5',
      batchId: 'batch-3',
      startDate: '2026-01-15',
      dueDate: '2026-08-05',
      monthlyFeePaise: 200000,
      status: 'active',
    },
    {
      id: 'enrollment-6',
      studentId: 'student-6',
      batchId: 'batch-2',
      startDate: '2025-09-01',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'cancelled',
    },
    {
      id: 'enrollment-7',
      studentId: 'student-7',
      batchId: 'batch-1',
      startDate: '2025-05-22',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'active',
    },
    {
      id: 'enrollment-8',
      studentId: 'student-8',
      batchId: 'batch-3',
      startDate: '2026-02-08',
      dueDate: '2026-08-05',
      monthlyFeePaise: 200000,
      status: 'active',
    },
    {
      id: 'enrollment-9',
      studentId: 'student-9',
      batchId: 'batch-2',
      startDate: '2025-08-16',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'active',
    },
    {
      id: 'enrollment-10',
      studentId: 'student-10',
      batchId: 'batch-1',
      startDate: '2025-04-20',
      dueDate: '2026-08-05',
      monthlyFeePaise: 250000,
      status: 'cancelled',
    },
  ] : []);
  private readonly attendanceState = signal<readonly AttendanceRecord[]>([]);
  private readonly chargesState = signal<readonly FeeCharge[]>(this.config.useMockApi ? [
    {
      id: 'charge-1',
      studentId: 'student-1',
      enrollmentId: 'enrollment-1',
      period: 'August 2026',
      amountPaise: 250000,
      dueDate: '2026-08-05',
    },
  ] : []);
  private readonly paymentsState = signal<readonly Payment[]>([]);
  private readonly notificationsState = signal<readonly NotificationLog[]>(this.config.useMockApi ? [
    {
      id: 'notification-1',
      studentId: 'student-1',
      type: 'check-in',
      recipientName: 'Mahesh Patil',
      recipientMobile: '9876543210',
      channel: 'whatsapp',
      status: 'delivered',
      createdAt: '2026-08-07T06:18:00+05:30',
    },
    {
      id: 'notification-2',
      studentId: 'student-2',
      type: 'fee-reminder',
      recipientName: 'Neha Shah',
      recipientMobile: '9822012345',
      channel: 'sms',
      status: 'sent',
      createdAt: '2026-08-07T05:45:00+05:30',
    },
    {
      id: 'notification-3',
      studentId: 'student-1',
      type: 'check-out',
      recipientName: 'Mahesh Patil',
      recipientMobile: '9876543210',
      channel: 'whatsapp',
      status: 'queued',
      createdAt: '2026-08-06T19:12:00+05:30',
    },
    {
      id: 'notification-4',
      studentId: 'student-2',
      type: 'announcement',
      recipientName: 'Neha Shah',
      recipientMobile: '9822012345',
      channel: 'whatsapp',
      status: 'failed',
      createdAt: '2026-08-06T17:30:00+05:30',
      failureReason: 'Provider could not reach this number.',
    },
  ] : []);

  readonly parents = this.parentsState.asReadonly();
  readonly students = this.studentsState.asReadonly();
  readonly batches = this.batchesState.asReadonly();
  readonly coaches = this.coachesState.asReadonly();
  readonly enrollments = this.enrollmentsState.asReadonly();
  readonly attendance = this.attendanceState.asReadonly();
  readonly charges = this.chargesState.asReadonly();
  readonly payments = this.paymentsState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();

  constructor() {
    if (this.config.useMockApi && this.config.backend === 'supabase') {
      throw new Error('Mock data cannot be enabled with the Supabase backend.');
    }
    if (!this.config.useMockApi) {
      this.hydrate({
        students: [], parents: [], batches: [], coaches: [],
        enrollments: [], attendance: [], charges: [], notifications: [],
      });
    }
  }

  readonly studentRows = computed(() =>
    this.students().map((student) => {
      const parent = this.parents().find((item) => item.id === student.parentId);
      const enrollment = this.enrollments().find(
        (item) => item.studentId === student.id && item.status === 'active',
      );
      const batch = this.batches().find((item) => item.id === enrollment?.batchId);
      return {
        ...student,
        parentName: parent?.name ?? '—',
        mobile: parent?.mobile ?? '—',
        batchName: batch?.name ?? 'Not enrolled',
      };
    }),
  );

  readonly activeEnrollmentRows = computed(() =>
    this.enrollments()
      .filter((item) => item.status === 'active')
      .map((enrollment) => ({
        ...enrollment,
        studentName:
          this.students().find((item) => item.id === enrollment.studentId)?.name ?? 'Unknown',
        batchName: this.batches().find((item) => item.id === enrollment.batchId)?.name ?? 'Unknown',
        attendance: this.attendance().find(
          (item) =>
            item.studentId === enrollment.studentId &&
            item.batchId === enrollment.batchId &&
            item.businessDate === today(),
        ),
      })),
  );
  readonly enrollmentRows = computed(() =>
    this.enrollments().map((enrollment) => ({
      ...enrollment,
      studentName:
        this.students().find((item) => item.id === enrollment.studentId)?.name ?? 'Unknown',
      batchName: this.batches().find((item) => item.id === enrollment.batchId)?.name ?? 'Unknown',
    })),
  );

  readonly feeRows = computed(() =>
    this.charges().map((charge) => {
      const paidPaise = this.payments()
        .filter((item) => item.chargeId === charge.id)
        .reduce((total, item) => total + item.amountPaise, 0);
      return {
        ...charge,
        studentName:
          this.students().find((item) => item.id === charge.studentId)?.name ?? 'Unknown',
        paidPaise,
        balancePaise: charge.amountPaise - paidPaise,
        status:
          paidPaise >= charge.amountPaise
            ? 'Paid'
            : paidPaise > 0
              ? 'Partial'
              : new Date(charge.dueDate) < new Date(today())
                ? 'Overdue'
                : 'Pending',
      };
    }),
  );

  identifyQrCode(code: string): QrIdentity {
    const studentId = code.trim().startsWith('TCA:') ? code.trim().slice(4) : code.trim();
    const student = this.students().find((item) => item.id === studentId);
    const enrollment = this.enrollments().find(
      (item) => item.studentId === studentId && item.status === 'active',
    );
    const batch = this.batches().find((item) => item.id === enrollment?.batchId);
    if (!student || !enrollment || !batch)
      throw new Error('No active enrolled student matches this QR code.');
    const attendance = this.attendance().find(
      (item) => item.studentId === studentId && item.businessDate === today(),
    );
    return { student, enrollment, batch, attendance };
  }

  buildReport(type: ReportType, from: string, to: string, batchId?: string): ReportDataset {
    const generatedAt = new Date().toISOString();
    const inRange = (value: string) => value.slice(0, 10) >= from && value.slice(0, 10) <= to;
    if (type === 'attendance') {
      const records = this.attendance().filter(
        (item) => inRange(item.businessDate) && (!batchId || item.batchId === batchId),
      );
      return {
        type,
        title: 'Attendance report',
        generatedAt,
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'student', label: 'Student' },
          { key: 'batch', label: 'Batch' },
          { key: 'checkIn', label: 'Check-in' },
          { key: 'checkOut', label: 'Check-out' },
          { key: 'status', label: 'Status' },
        ],
        rows: records.map((item) => ({
          date: item.businessDate,
          student:
            this.students().find((student) => student.id === item.studentId)?.name ?? 'Unknown',
          batch: this.batches().find((batch) => batch.id === item.batchId)?.name ?? 'Unknown',
          checkIn: item.checkInAt,
          checkOut: item.checkOutAt ?? '—',
          status: item.status,
        })),
        summary: [
          { label: 'Records', value: String(records.length) },
          { label: 'Checked out', value: String(records.filter((item) => item.checkOutAt).length) },
        ],
      };
    }
    if (type === 'enrollment') {
      const records = this.enrollmentRows().filter(
        (item) => inRange(item.startDate) && (!batchId || item.batchId === batchId),
      );
      return {
        type,
        title: 'Enrollment report',
        generatedAt,
        columns: [
          { key: 'student', label: 'Student' },
          { key: 'batch', label: 'Batch' },
          { key: 'startDate', label: 'Start date' },
          { key: 'fee', label: 'Monthly fee' },
          { key: 'status', label: 'Status' },
        ],
        rows: records.map((item) => ({
          student: item.studentName,
          batch: item.batchName,
          startDate: item.startDate,
          fee: item.monthlyFeePaise / 100,
          status: item.status,
        })),
        summary: [
          { label: 'Enrollments', value: String(records.length) },
          {
            label: 'Active',
            value: String(records.filter((item) => item.status === 'active').length),
          },
        ],
      };
    }
    if (type === 'revenue') {
      const payments = this.payments().filter((item) => inRange(item.paidAt));
      const total = payments.reduce((sum, item) => sum + item.amountPaise, 0);
      return {
        type,
        title: 'Revenue report',
        generatedAt,
        columns: [
          { key: 'receipt', label: 'Receipt' },
          { key: 'student', label: 'Student' },
          { key: 'date', label: 'Paid at' },
          { key: 'mode', label: 'Mode' },
          { key: 'amount', label: 'Amount (₹)' },
        ],
        rows: payments.map((item) => ({
          receipt: item.receiptNumber,
          student:
            this.students().find((student) => student.id === item.studentId)?.name ?? 'Unknown',
          date: item.paidAt,
          mode: item.mode,
          amount: item.amountPaise / 100,
        })),
        summary: [
          { label: 'Payments', value: String(payments.length) },
          { label: 'Collected', value: `₹${(total / 100).toLocaleString('en-IN')}` },
        ],
      };
    }
    const charges = this.feeRows().filter(
      (item) =>
        inRange(item.dueDate) &&
        (type !== 'pending' || item.balancePaise > 0) &&
        (!batchId ||
          this.enrollments().find((enrollment) => enrollment.id === item.enrollmentId)?.batchId ===
          batchId),
    );
    const outstanding = charges.reduce((sum, item) => sum + item.balancePaise, 0);
    const collected = charges.reduce((sum, item) => sum + item.paidPaise, 0);
    return {
      type,
      title: type === 'pending' ? 'Pending balances report' : 'Fee collection report',
      generatedAt,
      columns: [
        { key: 'student', label: 'Student' },
        { key: 'period', label: 'Period' },
        { key: 'dueDate', label: 'Due date' },
        { key: 'charge', label: 'Charge (₹)' },
        { key: 'paid', label: 'Paid (₹)' },
        { key: 'balance', label: 'Balance (₹)' },
        { key: 'status', label: 'Status' },
      ],
      rows: charges.map((item) => ({
        student: item.studentName,
        period: item.period,
        dueDate: item.dueDate,
        charge: item.amountPaise / 100,
        paid: item.paidPaise / 100,
        balance: item.balancePaise / 100,
        status: item.status,
      })),
      summary: [
        { label: 'Charges', value: String(charges.length) },
        { label: 'Collected', value: `₹${(collected / 100).toLocaleString('en-IN')}` },
        { label: 'Outstanding', value: `₹${(outstanding / 100).toLocaleString('en-IN')}` },
      ],
    };
  }

  hydrateAttendance(input: {
    students: readonly Student[];
    batches: readonly Batch[];
    enrollments: readonly Enrollment[];
    attendance: readonly AttendanceRecord[];
  }): void {
    this.studentsState.set(input.students);
    this.batchesState.set(input.batches);
    this.enrollmentsState.set(input.enrollments);
    const pending = this.attendance().filter((record) => record.syncState);
    this.attendanceState.set([
      ...input.attendance.filter(
        (record) =>
          !pending.some(
            (local) =>
              local.studentId === record.studentId &&
              local.batchId === record.batchId &&
              local.businessDate === record.businessDate,
          ),
      ),
      ...pending,
    ]);
  }

  hydrate(input: {
    students: readonly Student[];
    parents: readonly Parent[];
    batches: readonly Batch[];
    coaches?: readonly Coach[];
    enrollments: readonly Enrollment[];
    attendance: readonly AttendanceRecord[];
    charges: readonly (FeeCharge & { readonly paidPaise?: number })[];
    notifications?: readonly NotificationLog[];
  }): void {
    this.studentsState.set(input.students);
    this.parentsState.set(input.parents);
    this.batchesState.set(input.batches);
    this.coachesState.set(input.coaches ?? []);
    this.enrollmentsState.set(input.enrollments);
    this.attendanceState.set(input.attendance);
    this.chargesState.set(input.charges.map(({ paidPaise: _paid, ...charge }) => charge));
    this.paymentsState.set(
      input.charges
        .filter((charge) => (charge.paidPaise ?? 0) > 0)
        .map((charge) => ({
          id: `server-total-${charge.id}`,
          chargeId: charge.id,
          studentId: charge.studentId,
          amountPaise: charge.paidPaise ?? 0,
          mode: 'online',
          paidAt: new Date().toISOString(),
          receiptNumber: 'Server total',
        })),
    );
    this.notificationsState.set(input.notifications ?? []);
  }

  registerStudent(input: StudentRegistration): string {
    this.requireMockMutation();
    if (!input.studentName.trim() || !input.parentName.trim() || !input.dateOfBirth)
      throw new Error('Student, parent, and date of birth are required.');
    if (!/^\d{10}$/.test(input.mobile) || !/^\d{10}$/.test(input.whatsapp))
      throw new Error('Enter valid 10-digit parent contact numbers.');
    if (new Date(`${input.dateOfBirth}T00:00:00`) > new Date())
      throw new Error('Date of birth cannot be in the future.');
    const parentId = this.id('parent');
    const studentId = this.id('student');
    this.parentsState.update((items) => [
      ...items,
      {
        id: parentId,
        name: input.parentName.trim(),
        mobile: input.mobile,
        whatsapp: input.whatsapp,
        relation: input.relation,
      },
    ]);
    this.studentsState.update((items) => [
      ...items,
      {
        id: studentId,
        parentId,
        name: input.studentName.trim(),
        dateOfBirth: input.dateOfBirth,
        skillLevel: input.skillLevel,
        status: 'active',
      },
    ]);
    return studentId;
  }

  updateStudent(
    studentId: string,
    changes: Pick<Student, 'name' | 'dateOfBirth' | 'skillLevel' | 'status'>,
  ): void {
    this.requireMockMutation();
    if (!changes.name.trim()) throw new Error('Student name is required.');
    this.studentsState.update((items) =>
      items.map((item) =>
        item.id === studentId ? { ...item, ...changes, name: changes.name.trim() } : item,
      ),
    );
  }

  updateParent(parentId: string, changes: Omit<Parent, 'id'>): void {
    this.requireMockMutation();
    if (
      !changes.name.trim() ||
      !/^\d{10}$/.test(changes.mobile) ||
      !/^\d{10}$/.test(changes.whatsapp)
    )
      throw new Error('Enter valid parent details and 10-digit contact numbers.');
    this.parentsState.update((items) =>
      items.map((item) =>
        item.id === parentId ? { ...item, ...changes, name: changes.name.trim() } : item,
      ),
    );
  }

  addParent(input: Omit<Parent, 'id'>): string {
    this.requireMockMutation();
    if (!input.name.trim() || !/^\d{10}$/.test(input.mobile) || !/^\d{10}$/.test(input.whatsapp))
      throw new Error('Enter a parent name and valid 10-digit contact numbers.');
    const id = this.id('parent');
    this.parentsState.update((items) => [...items, { ...input, id, name: input.name.trim() }]);
    return id;
  }

  linkStudentToParent(studentId: string, parentId: string): void {
    this.requireMockMutation();
    if (!this.parents().some((parent) => parent.id === parentId))
      throw new Error('Select a valid parent.');
    this.studentsState.update((items) =>
      items.map((student) => (student.id === studentId ? { ...student, parentId } : student)),
    );
  }

  addBatch(input: Omit<Batch, 'id'>): void {
    this.requireMockMutation();
    if (!input.name.trim() || input.capacity < 1 || input.monthlyFeePaise < 1)
      throw new Error('Enter valid batch details.');
    if (
      this.batches().some(
        (item) =>
          item.name.trim().toLowerCase() === input.name.trim().toLowerCase() ||
          Boolean(input.code && item.code?.toLowerCase() === input.code.toLowerCase()),
      )
    )
      throw new Error('A batch with this name or code already exists.');
    this.assertCoachScheduleAvailable(input.coachId, input.schedule);
    this.batchesState.update((items) => [
      ...items,
      { ...input, name: input.name.trim(), id: this.id('batch') },
    ]);
  }

  addCoach(input: Omit<Coach, 'id'>): void {
    this.requireMockMutation();
    if (!input.name.trim() || !/^\d{10}$/.test(input.mobile))
      throw new Error('Enter a coach name and valid 10-digit mobile number.');
    this.coachesState.update((items) => [
      ...items,
      { ...input, name: input.name.trim(), id: this.id('coach') },
    ]);
  }

  updateCoach(coachId: string, changes: Omit<Coach, 'id'>): void {
    this.requireMockMutation();
    if (!changes.name.trim() || !/^\d{10}$/.test(changes.mobile))
      throw new Error('Enter valid coach details.');
    this.coachesState.update((items) =>
      items.map((item) =>
        item.id === coachId ? { ...item, ...changes, name: changes.name.trim() } : item,
      ),
    );
  }

  updateBatch(batchId: string, changes: Omit<Batch, 'id'>): void {
    this.requireMockMutation();
    const activeCount = this.enrollments().filter(
      (item) => item.batchId === batchId && item.status === 'active',
    ).length;
    if (changes.capacity < activeCount)
      throw new Error(`Capacity cannot be below ${activeCount} active enrollments.`);
    if (
      this.batches().some(
        (item) =>
          item.id !== batchId &&
          (item.name.trim().toLowerCase() === changes.name.trim().toLowerCase() ||
            Boolean(changes.code && item.code?.toLowerCase() === changes.code.toLowerCase())),
      )
    )
      throw new Error('A batch with this name or code already exists.');
    this.assertCoachScheduleAvailable(changes.coachId, changes.schedule, batchId);
    this.batchesState.update((items) =>
      items.map((item) =>
        item.id === batchId
          ? { ...item, ...changes, coachId: changes.coachId, name: changes.name.trim() }
          : item,
      ),
    );
  }

  deleteBatch(batchId: string): void {
    this.requireMockMutation();
    if (this.enrollments().some((item) => item.batchId === batchId && item.status === 'active'))
      throw new Error('This batch has active enrollments and cannot be deleted.');
    this.batchesState.update((items) => items.filter((item) => item.id !== batchId));
  }

  enroll(
    studentId: string,
    batchId: string,
    startDate: string,
    dueDate: string,
    monthlyFeePaise: number,
  ): void {
    this.requireMockMutation();
    if (!this.students().some((item) => item.id === studentId && item.status === 'active'))
      throw new Error('Select an active student.');
    if (!startDate || !dueDate || dueDate < startDate)
      throw new Error('The fee due date must be on or after the enrollment start date.');
    if (!Number.isSafeInteger(monthlyFeePaise) || monthlyFeePaise <= 0)
      throw new Error('Enter a valid fee amount.');
    if (this.enrollments().some((item) => item.studentId === studentId && item.status === 'active'))
      throw new Error('Student already has an active enrollment.');
    const batch = this.batches().find((item) => item.id === batchId);
    const activeCount = this.enrollments().filter(
      (item) => item.batchId === batchId && item.status === 'active',
    ).length;
    if (!batch) throw new Error('Select a valid batch.');
    if (activeCount >= batch.capacity) throw new Error('This batch has reached capacity.');
    const enrollmentId = this.id('enrollment');
    this.enrollmentsState.update((items) => [
      ...items,
      {
        id: enrollmentId,
        studentId,
        batchId,
        startDate,
        dueDate,
        monthlyFeePaise,
        status: 'active',
      },
    ]);
    this.chargesState.update((items) => [
      ...items,
      {
        id: this.id('charge'),
        studentId,
        enrollmentId,
        period: 'August 2026',
        amountPaise: monthlyFeePaise,
        dueDate,
      },
    ]);
  }

  setEnrollmentStatus(enrollmentId: string, status: 'paused' | 'cancelled'): void {
    this.requireMockMutation();
    this.enrollmentsState.update((items) =>
      items.map((item) => (item.id === enrollmentId ? { ...item, status } : item)),
    );
  }

  reactivateEnrollment(enrollmentId: string): void {
    this.requireMockMutation();
    const enrollment = this.enrollments().find((item) => item.id === enrollmentId);
    if (!enrollment || enrollment.status !== 'paused')
      throw new Error('Only paused enrollments can be reactivated.');
    if (
      this.enrollments().some(
        (item) => item.studentId === enrollment.studentId && item.status === 'active',
      )
    )
      throw new Error('Student already has an active enrollment.');
    this.assertBatchCapacity(enrollment.batchId);
    this.enrollmentsState.update((items) =>
      items.map((item) => (item.id === enrollmentId ? { ...item, status: 'active' } : item)),
    );
  }

  transferEnrollment(enrollmentId: string, targetBatchId: string, startDate: string): void {
    this.requireMockMutation();
    const enrollment = this.enrollments().find((item) => item.id === enrollmentId);
    if (!enrollment || enrollment.status !== 'active')
      throw new Error('Only active enrollments can be transferred.');
    if (enrollment.batchId === targetBatchId) throw new Error('Select a different target batch.');
    this.assertBatchCapacity(targetBatchId);
    this.enrollmentsState.update((items) => [
      ...items.map((item) =>
        item.id === enrollmentId ? { ...item, status: 'cancelled' as const } : item,
      ),
      {
        ...enrollment,
        id: this.id('enrollment'),
        batchId: targetBatchId,
        startDate,
        status: 'active',
      },
    ]);
  }

  checkIn(studentId: string, batchId: string): void {
    this.requireMockMutation();
    if (
      !this.enrollments().some(
        (item) =>
          item.studentId === studentId && item.batchId === batchId && item.status === 'active',
      )
    )
      throw new Error('Student does not have an active enrollment in this batch.');
    if (
      this.attendance().some(
        (item) => item.studentId === studentId && item.businessDate === today(),
      )
    )
      throw new Error('Student is already checked in today.');
    this.attendanceState.update((items) => [
      ...items,
      {
        id: this.id('attendance'),
        studentId,
        batchId,
        businessDate: today(),
        checkInAt: nowTime(),
        status: 'present',
      },
    ]);
    this.queueAttendanceNotification(studentId, 'check-in');
  }

  checkOut(attendanceId: string): void {
    this.requireMockMutation();
    const record = this.attendance().find((item) => item.id === attendanceId);
    if (!record) throw new Error('Attendance record was not found.');
    if (record.checkOutAt) throw new Error('Student is already checked out.');
    this.attendanceState.update((items) =>
      items.map((item) =>
        item.id === attendanceId ? { ...item, checkOutAt: nowTime(), status: 'checked-out' } : item,
      ),
    );
    this.queueAttendanceNotification(record.studentId, 'check-out');
  }

  addPendingCheckIn(operationId: string, studentId: string, batchId: string): void {
    if (
      this.attendance().some(
        (item) => item.studentId === studentId && item.businessDate === today(),
      )
    )
      throw new Error('Student already has an attendance record today.');
    this.attendanceState.update((items) => [
      ...items,
      {
        id: `local-${operationId}`,
        studentId,
        batchId,
        businessDate: today(),
        checkInAt: nowTime(),
        status: 'present',
        syncState: 'pending',
      },
    ]);
  }

  markPendingCheckOut(operationId: string, attendanceId: string): void {
    if (attendanceId.startsWith('local-'))
      throw new Error('Sync the pending check-in before recording checkout offline.');
    this.attendanceState.update((items) =>
      items.map((item) =>
        item.id === attendanceId
          ? { ...item, checkOutAt: nowTime(), status: 'checked-out', syncState: 'pending' }
          : item,
      ),
    );
  }

  reconcileAttendance(operationId: string, record: AttendanceRecord): void {
    this.attendanceState.update((items) => [
      ...items.filter((item) => item.id !== `local-${operationId}` && item.id !== record.id),
      { ...record, syncState: undefined },
    ]);
  }

  markAttendanceSyncState(
    operationId: string,
    attendanceId: string | undefined,
    syncState: 'conflict' | 'failed',
  ): void {
    this.attendanceState.update((items) =>
      items.map((item) =>
        item.id === `local-${operationId}` || item.id === attendanceId
          ? { ...item, syncState }
          : item,
      ),
    );
  }

  recordPayment(chargeId: string, amountPaise: number, mode: PaymentMode): Payment {
    this.requireMockMutation();
    const charge = this.feeRows().find((item) => item.id === chargeId);
    if (
      !charge ||
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      amountPaise > charge.balancePaise
    )
      throw new Error('Payment amount must be within the outstanding balance.');
    const payment: Payment = {
      id: this.id('payment'),
      chargeId,
      studentId: charge.studentId,
      amountPaise,
      mode,
      paidAt: new Date().toISOString(),
      receiptNumber: `TCA-${new Date().getFullYear()}-${String(this.sequence).padStart(5, '0')}`,
    };
    this.paymentsState.update((items) => [...items, payment]);
    return payment;
  }

  addMonthlyCharge(
    enrollmentId: string,
    period: string,
    dueDate: string,
    amountPaise: number,
  ): void {
    this.requireMockMutation();
    const enrollment = this.enrollments().find(
      (item) => item.id === enrollmentId && item.status === 'active',
    );
    if (!enrollment) throw new Error('Select an active enrollment.');
    if (!period.trim() || !dueDate || !Number.isSafeInteger(amountPaise) || amountPaise <= 0)
      throw new Error('Enter valid monthly charge details.');
    if (
      this.charges().some(
        (item) =>
          item.enrollmentId === enrollmentId &&
          item.period.toLowerCase() === period.trim().toLowerCase(),
      )
    )
      throw new Error('A charge already exists for this student and month.');
    this.chargesState.update((items) => [
      ...items,
      {
        id: this.id('charge'),
        enrollmentId,
        studentId: enrollment.studentId,
        period: period.trim(),
        dueDate,
        amountPaise,
      },
    ]);
  }

  private requireMockMutation(): void {
    if (!this.config.useMockApi) {
      throw new Error('Academy records must be changed through the API.');
    }
  }

  private id(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  private assertBatchCapacity(batchId: string): void {
    const batch = this.batches().find((item) => item.id === batchId);
    const activeCount = this.enrollments().filter(
      (item) => item.batchId === batchId && item.status === 'active',
    ).length;
    if (!batch) throw new Error('Select a valid batch.');
    if (activeCount >= batch.capacity) throw new Error('This batch has reached capacity.');
  }

  private assertCoachScheduleAvailable(
    coachId: string | undefined,
    schedule: string,
    ignoredBatchId?: string,
  ): void {
    if (!coachId || !schedule.trim()) return;
    const conflict = this.batches().find(
      (item) =>
        item.id !== ignoredBatchId &&
        item.coachId === coachId &&
        item.schedule.trim().toLowerCase() === schedule.trim().toLowerCase(),
    );
    if (conflict)
      throw new Error(`Coach is already assigned to ${conflict.name} at this schedule.`);
  }

  private queueAttendanceNotification(studentId: string, type: 'check-in' | 'check-out'): void {
    const student = this.students().find((item) => item.id === studentId);
    const parent = this.parents().find((item) => item.id === student?.parentId);
    if (!student || !parent) return;
    this.notificationsState.update((items) => [
      {
        id: this.id('notification'),
        studentId,
        type,
        recipientName: parent.name,
        recipientMobile: parent.whatsapp,
        channel: 'whatsapp',
        status: 'queued',
        createdAt: new Date().toISOString(),
      },
      ...items,
    ]);
  }
}
