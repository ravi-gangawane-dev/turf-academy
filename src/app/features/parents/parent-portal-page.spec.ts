import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NotificationsService } from '../../core/supabase/domain-services';
import { ParentPortalService } from './parent-portal.service';
import { ParentPortalData } from './parent-portal.models';
import { ParentPortalPage } from './parent-portal-page';

const workspace = {
  student: {
    id: 's1',
    studentCode: 'ST-1',
    status: 'active',
    fullName: 'Aarav Sharma',
    dateOfBirth: '2014-05-06',
    gender: 'Male',
    skillLevel: 'Beginner',
    phone: '9876543210',
    email: null,
    address: '12 MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411001',
    joinedOn: '2026-06-01',
    photoUrl: null,
    bloodGroup: null,
    nationality: 'Indian',
    aadhaar: null,
    batchId: 'b1',
    coachId: 'c1',
    parentName: 'Ravi Sharma',
    parentRelation: 'Father',
    parentPhone: '9812345678',
    parentEmail: null,
  },
  attendance: [
    { id: 'a1', attendance_date: '2026-10-01', status: 'present', check_in_at: '2026-10-01T09:00:00Z', check_out_at: '2026-10-01T10:30:00Z' },
    { id: 'a2', attendance_date: '2026-10-02', status: 'late', check_in_at: '2026-10-02T09:40:00Z', check_out_at: '2026-10-02T11:00:00Z' },
    { id: 'a3', attendance_date: '2026-10-03', status: 'absent', check_in_at: null, check_out_at: null },
    { id: 'a4', attendance_date: '2026-10-04', status: 'checked_out', check_in_at: '2026-10-04T09:00:00Z', check_out_at: '2026-10-04T10:00:00Z' },
  ],
};

const data = {
  parent: {
    id: 'p1',
    profile_id: 'u1',
    full_name: 'Ravi Sharma',
    relation: 'Father',
    phone: '9812345678',
    whatsapp: '9812345678',
    email: 'ravi@example.com',
    occupation: 'Engineer',
    address: { formatted: '12 MG Road', city: 'Pune', state: 'Maharashtra', pinCode: '411001' },
    communication_preferences: {},
    status: 'active',
    photo_path: null,
    photo_url: 'https://cdn.example.com/ravi.png',
    created_at: '2026-01-01',
    student_parents: [],
  },
  children: [{ link: { is_primary: true, can_pick_up: true, student: { id: 's1' } }, workspace }],
  selected: { link: { is_primary: true, can_pick_up: true, student: { id: 's1' } }, workspace },
  charges: [
    { id: 'c1', final_amount: 3000, paid_amount: 1000, balance_amount: 2000 },
    { id: 'c2', final_amount: 3000, paid_amount: 3000, balance_amount: 0 },
  ],
  notifications: [{ id: 'n1', subject: 'Fee reminder', read_at: null }],
  batchDays: [{ id: 'bd1', day_of_week: 1 }],
  coaches: [],
  sessions: [{ id: 'se1', session_date: '2026-10-01', title: 'Morning batch', start_time: '09:00', end_time: '10:30', venue: 'Ground 1', status: 'scheduled' }],
  attendancePage: { rows: [], total: 0 },
  paymentPage: { rows: [], total: 0 },
  notificationPage: { rows: [], total: 0 },
} as unknown as ParentPortalData;

function setup(view = 'children') {
  const load = vi.fn().mockResolvedValue(data);
  const selectChild = vi.fn();
  const subscribe = vi.fn().mockReturnValue([]);
  const unsubscribe = vi.fn().mockResolvedValue(undefined);
  const markRead = vi.fn().mockResolvedValue(undefined);
  const markAllRead = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { view } } } },
      { provide: ParentPortalService, useValue: { load, selectChild, subscribe, unsubscribe } },
      { provide: NotificationsService, useValue: { markRead, markAllRead } },
    ],
  });
  const fixture = TestBed.createComponent(ParentPortalPage);
  return { fixture, page: fixture.componentInstance, load, selectChild, subscribe, unsubscribe, markRead, markAllRead };
}

describe('ParentPortalPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { page } = setup();
    expect(page).toBeTruthy();
  });

  it('loads the portal data for the selected view', async () => {
    const { page, load } = setup('attendance');
    await page.ngOnInit();
    expect(load).toHaveBeenCalledWith(expect.objectContaining({ attendancePage: 1, paymentPage: 1, notificationPage: 1 }));
    expect(page['data']()).toBe(data);
    expect(page['loading']()).toBe(false);
    expect(page['viewTitle']()).toBe('Attendance Summary & History');
  });

  it('summarises the attendance of the selected child', async () => {
    const { page } = setup('attendance');
    await page.ngOnInit();
    expect(page['attendance']()).toEqual({ total: 4, present: 2, late: 1, absent: 1, rate: 75 });
  });

  it('summarises the fee balances of the selected child', async () => {
    const { page } = setup('fees');
    await page.ngOnInit();
    expect(page['fees']()).toEqual({ total: 6000, paid: 4000, pending: 2000 });
  });

  it('reports the parent profile completion', async () => {
    const { page } = setup('profile');
    await page.ngOnInit();
    const completion = page['profileCompletion']();
    expect(completion.total).toBe(9);
    expect(completion.completed).toBe(9);
    expect(completion.percentage).toBe(100);
    expect(completion.missing).toEqual([]);
  });

  it('lists the missing parent profile details', async () => {
    const { page } = setup('profile');
    await page.ngOnInit();
    page['data'].set({
      ...data,
      parent: { ...data.parent, occupation: null, email: null, photo_url: null },
    });
    const completion = page['profileCompletion']();
    expect(completion.missing).toEqual(expect.arrayContaining(['Profile photo', 'Email address', 'Occupation']));
    expect(completion.percentage).toBeLessThan(100);
  });

  it('marks the attendance of the current month on the calendar', async () => {
    const { page } = setup('calendar');
    await page.ngOnInit();
    page['month'].set(new Date(2026, 9, 1));
    const days = page['calendarDays']();
    const first = days.find((day) => day && day.day === 1);
    expect(first?.status).toBe('present');
    const second = days.find((day) => day && day.day === 2);
    expect(second?.status).toBe('late');
    const third = days.find((day) => day && day.day === 3);
    expect(third?.status).toBe('absent');
  });

  it('builds the training schedule from the sessions', async () => {
    const { page } = setup('schedule');
    await page.ngOnInit();
    const schedule = page['schedule']();
    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toMatchObject({ name: 'Morning batch', venue: 'Ground 1', coach: 'To be assigned' });
  });

  it('switches the selected child and reloads the portal', async () => {
    const { page, selectChild, load } = setup();
    await page.ngOnInit();
    load.mockClear();
    await page['changeChild']({ target: { value: 's2' } } as unknown as Event);
    expect(selectChild).toHaveBeenCalledWith('s2');
    expect(load).toHaveBeenCalled();
  });

  it('marks a single notification as read and reloads', async () => {
    const { page, markRead, load } = setup('notifications');
    await page.ngOnInit();
    load.mockClear();
    await page['markRead']('n1');
    expect(markRead).toHaveBeenCalledWith('n1');
    expect(load).toHaveBeenCalled();
  });

  it('ignores a mark-as-read request without a notification id', async () => {
    const { page, markRead } = setup('notifications');
    await page.ngOnInit();
    await page['markRead'](undefined);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('marks every notification as read', async () => {
    const { page, markAllRead } = setup('notifications');
    await page.ngOnInit();
    await page['markAllRead']();
    expect(markAllRead).toHaveBeenCalled();
  });

  it('shows a failure when the portal cannot be loaded', async () => {
    const { page, load } = setup();
    load.mockRejectedValue(new Error('Parent portal could not be loaded.'));
    await page.ngOnInit();
    expect(page['error']()).toBe('Parent portal could not be loaded.');
    expect(page['loading']()).toBe(false);
  });

  it('releases the realtime subscriptions when the page is destroyed', async () => {
    const { page, unsubscribe } = setup();
    await page.ngOnInit();
    page.ngOnDestroy();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('opens the child profile in the parent portal', async () => {
    const { page } = setup();
    await page.ngOnInit();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page['childProfile']('s1');
    expect(navigate).toHaveBeenCalledWith(['/parent/children', 's1']);
  });
});
