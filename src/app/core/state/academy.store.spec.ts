import { TestBed } from '@angular/core/testing';
import { AcademyStore } from './academy.store';
import { API_CONFIG } from '../config/api.config';

describe('AcademyStore', () => {
  let store: AcademyStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: API_CONFIG,
          useValue: { baseUrl: '/api/v1', useMockApi: true, backend: 'mock' },
        },
      ],
    });
    store = TestBed.inject(AcademyStore);
  });

  it('creates a student and linked parent together', () => {
    const studentId = store.registerStudent({
      studentName: 'Test Player',
      dateOfBirth: '2014-01-01',
      skillLevel: 'Beginner',
      parentName: 'Test Parent',
      mobile: '9999999999',
      whatsapp: '9999999999',
      relation: 'Mother',
    });
    const student = store.students().find((item) => item.id === studentId);
    expect(student).toBeTruthy();
    expect(store.parents().find((item) => item.id === student?.parentId)?.name).toBe('Test Parent');
  });

  it('prevents duplicate daily check-in', () => {
    store.checkIn('student-1', 'batch-2');
    expect(store.notifications()[0]?.type).toBe('check-in');
    expect(() => store.checkIn('student-1', 'batch-2')).toThrowError(
      'Student is already checked in today.',
    );
  });

  it('refreshes attendance without erasing payments or pending offline attendance', () => {
    store.recordPayment('charge-1', 50000, 'upi');
    const payments = store.payments();
    store.addPendingCheckIn('queued-check-in', 'student-1', 'batch-2');
    const pending = store.attendance().find((record) => record.id === 'local-queued-check-in')!;
    store.hydrateAttendance({
      students: store.students(),
      batches: store.batches(),
      enrollments: store.enrollments(),
      attendance: [
        { ...pending, id: 'server-absent', checkInAt: '', status: 'absent', syncState: undefined },
      ],
    });
    expect(store.payments()).toEqual(payments);
    expect(store.attendance()).toEqual([pending]);
    expect(store.feeRows().find((row) => row.id === 'charge-1')?.balancePaise).toBe(200000);
  });

  it('requires an active matching enrollment for check-in', () => {
    expect(() => store.checkIn('student-2', 'batch-1')).toThrowError(
      'Student does not have an active enrollment in this batch.',
    );
  });

  it('requires an open attendance record for check-out', () => {
    store.checkIn('student-1', 'batch-2');
    const attendance = store.attendance().find((item) => item.studentId === 'student-1');
    expect(attendance).toBeTruthy();
    store.checkOut(attendance!.id);
    expect(() => store.checkOut(attendance!.id)).toThrowError('Student is already checked out.');
  });

  it('resolves a QR identity without mutating attendance', () => {
    const before = store.attendance().length;
    const identity = store.identifyQrCode('TCA:student-1');
    expect(identity.student.name).toBe('Rohan Patil');
    expect(identity.batch.id).toBe('batch-2');
    expect(store.attendance().length).toBe(before);
  });

  it('resolves the seeded QA camera student and its active batch', () => {
    const identity = store.identifyQrCode('TCA:qa-camera-student');
    expect(identity.student.name).toBe('QA Camera Test Student');
    expect(identity.batch.id).toBe('batch-1');
  });

  it('transfers an active enrollment while preserving history', () => {
    store.transferEnrollment('enrollment-1', 'batch-1', '2026-08-10');
    expect(store.enrollments().find((item) => item.id === 'enrollment-1')?.status).toBe(
      'cancelled',
    );
    expect(
      store
        .enrollments()
        .some(
          (item) =>
            item.studentId === 'student-1' &&
            item.batchId === 'batch-1' &&
            item.status === 'active',
        ),
    ).toBe(true);
  });

  it('supports partial payment and rejects overpayment', () => {
    store.recordPayment('charge-1', 100000, 'upi');
    expect(store.feeRows().find((item) => item.id === 'charge-1')?.balancePaise).toBe(150000);
    expect(() => store.recordPayment('charge-1', 150001, 'cash')).toThrowError(
      'Payment amount must be within the outstanding balance.',
    );
    expect(() => store.recordPayment('charge-1', 10.5, 'cash')).toThrowError(
      'Payment amount must be within the outstanding balance.',
    );
  });

  it('creates one monthly charge per enrollment and period', () => {
    store.addMonthlyCharge('enrollment-1', 'September 2026', '2026-09-10', 250000);
    expect(
      store
        .feeRows()
        .some((item) => item.enrollmentId === 'enrollment-1' && item.period === 'September 2026'),
    ).toBe(true);
    expect(() =>
      store.addMonthlyCharge('enrollment-1', 'September 2026', '2026-09-10', 250000),
    ).toThrowError('A charge already exists for this student and month.');
  });

  it('rejects invalid enrollment dates and duplicate batch names', () => {
    expect(() =>
      store.enroll('student-2', 'batch-1', '2026-09-10', '2026-09-01', 250000),
    ).toThrowError('The fee due date must be on or after the enrollment start date.');
    const batch = store.batches()[0];
    const { id: _id, ...duplicate } = batch;
    expect(() => store.addBatch(duplicate)).toThrowError(
      'A batch with this name or code already exists.',
    );
  });

  it('creates a coach that can be assigned to a batch', () => {
    store.addCoach({
      name: 'New Coach',
      mobile: '9777777777',
      specialization: 'Fielding',
      status: 'active',
    });
    const coach = store.coaches().find((item) => item.name === 'New Coach');
    expect(coach).toBeTruthy();
    const batch = store.batches()[2];
    store.updateBatch(batch.id, {
      name: batch.name,
      schedule: batch.schedule,
      capacity: batch.capacity,
      monthlyFeePaise: batch.monthlyFeePaise,
      coachId: coach?.id,
    });
    expect(store.batches().find((item) => item.id === batch.id)?.coachId).toBe(coach?.id);
  });

  it('persists extended coach fields and unassigns batches', () => {
    const coach = store.coaches()[0];
    store.updateCoach(coach.id, {
      ...coach,
      biography: 'Experienced coach',
      qualification: 'NIS Level 2',
      experienceYears: 8,
    });
    expect(store.coaches()[0].biography).toBe('Experienced coach');
    const batch = store.batches()[0];
    const { coachId: _, ...unassigned } = batch;
    store.updateBatch(batch.id, unassigned);
    expect(store.batches()[0].coachId).toBeUndefined();
  });

  it('persists an extended parent profile', () => {
    const id = store.addParent({
      name: 'Full Parent',
      mobile: '9111111111',
      whatsapp: '9222222222',
      relation: 'Guardian',
      email: 'parent@example.com',
      address: 'Pune',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
      communication: 'Email',
      parentType: 'Primary guardian',
      status: 'active',
      notes: 'Call after 6 PM',
    });
    expect(store.parents().find((parent) => parent.id === id)?.email).toBe('parent@example.com');
    expect(store.parents().find((parent) => parent.id === id)?.notes).toBe('Call after 6 PM');
  });

  it('links an existing student to a different parent', () => {
    store.linkStudentToParent('student-1', 'parent-2');
    expect(store.students().find((student) => student.id === 'student-1')?.parentId).toBe(
      'parent-2',
    );
  });

  it('builds fee reports from paise-based balances', () => {
    store.recordPayment('charge-1', 50000, 'upi');
    const report = store.buildReport('fees', '2026-08-01', '2026-08-31');
    expect(report.rows[0]?.['paid']).toBe(500);
    expect(report.rows[0]?.['balance']).toBe(2000);
    expect(report.summary.find((item) => item.label === 'Outstanding')?.value).toBe('₹2,000');
  });
});


describe('AcademyStore API-only mode', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    { provide: API_CONFIG, useValue: { backend: 'supabase', useMockApi: false } },
  ] }));

  it('starts without fabricated business records and rejects local-only writes', () => {
    const store = TestBed.inject(AcademyStore);
    for (const rows of [store.students, store.parents, store.batches, store.coaches,
      store.enrollments, store.attendance, store.charges, store.payments, store.notifications]) {
      expect(rows()).toEqual([]);
    }
    expect(() => store.checkIn('s1', 'b1')).toThrow('through the API');
    expect(() => store.recordPayment('c1', 100, 'upi')).toThrow('through the API');
    expect(() => store.linkStudentToParent('s1', 'p1')).toThrow('through the API');
    expect(store.attendance()).toEqual([]);
    expect(store.payments()).toEqual([]);
  });

  it('rejects contradictory mock and Supabase configuration', () => {
    TestBed.overrideProvider(API_CONFIG, { useValue: { backend: 'supabase', useMockApi: true } });
    expect(() => TestBed.inject(AcademyStore)).toThrow('Mock data cannot be enabled');
  });
});
