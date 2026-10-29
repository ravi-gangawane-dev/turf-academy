import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AcademyEventRecord, AcademyEventsService } from '../../core/supabase/domain-services';
import { ToastService } from '../../shared/toast/toast.service';
import { AcademyEventsPage } from './academy-events-page';

const event: AcademyEventRecord = {
  id: 'e1',
  event_type: 'holiday',
  title: 'Academy closed',
  event_date: '2026-10-26',
  description: 'Diwali holiday',
  status: 'active',
  created_at: '2026-10-01',
};

function setup() {
  const page = vi.fn().mockResolvedValue({ rows: [event], total: 1 });
  const save = vi.fn().mockResolvedValue(event);
  const setStatus = vi.fn().mockResolvedValue(undefined);
  const toast = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AcademyEventsService, useValue: { page, save, setStatus } },
      { provide: ToastService, useValue: { show: toast } },
      { provide: AuthService, useValue: { role: () => 'admin' } },
    ],
  });
  const fixture = TestBed.createComponent(AcademyEventsPage);
  return { fixture, component: fixture.componentInstance, page, save, setStatus, toast };
}

describe('AcademyEventsPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  it('loads the first page of events on start-up', async () => {
    const { component, page } = setup();
    await component.ngOnInit();
    expect(page).toHaveBeenCalledWith(1, 5, expect.objectContaining({ search: '', eventType: '', status: '' }));
    expect(component['rows']()).toHaveLength(1);
    expect(component['total']()).toBe(1);
    expect(component['loading']()).toBe(false);
  });

  it('opens the add dialog with today as the default date', async () => {
    const { component } = setup();
    await component.ngOnInit();
    component['open']();
    expect(component['dialogOpen']()).toBe(true);
    expect(component['editingId']()).toBeNull();
    const value = component['form'].getRawValue();
    expect(value.eventType).toBe('holiday');
    expect(value.title).toBe('');
    expect(value.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('loads the selected event into the dialog for editing', async () => {
    const { component } = setup();
    await component.ngOnInit();
    component['open'](event);
    expect(component['editingId']()).toBe('e1');
    const value = component['form'].getRawValue();
    expect(value.title).toBe('Academy closed');
    expect(value.eventDate).toBe('2026-10-26');
    expect(value.description).toBe('Diwali holiday');
  });

  it('refuses to save an incomplete event', async () => {
    const { component, save } = setup();
    await component.ngOnInit();
    component['open']();
    await component['save']();
    expect(save).not.toHaveBeenCalled();
    expect(component['form'].controls.title.touched).toBe(true);
  });

  it('saves a new event and reloads the list', async () => {
    const { component, save, toast } = setup();
    await component.ngOnInit();
    component['open']();
    component['form'].patchValue({ title: '  Sports day  ', description: ' Annual event ' });
    await component['save']();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sports day', description: 'Annual event', event_type: 'holiday' }),
    );
    expect(component['dialogOpen']()).toBe(false);
    expect(toast).toHaveBeenCalledWith('Event saved.', 'success');
  });

  it('keeps the archived status when an archived event is edited', async () => {
    const { component, save } = setup();
    await component.ngOnInit();
    component['open']({ ...event, status: 'inactive' });
    component['form'].patchValue({ title: 'Academy closed' });
    await component['save']();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', status: 'inactive' }));
  });

  it('archives an active event and activates an archived one', async () => {
    const { component, setStatus, toast } = setup();
    await component.ngOnInit();
    await component['toggle'](event);
    expect(setStatus).toHaveBeenCalledWith('e1', 'inactive');
    expect(toast).toHaveBeenCalledWith('Event archived.', 'success');
    await component['toggle']({ ...event, status: 'inactive' });
    expect(setStatus).toHaveBeenLastCalledWith('e1', 'active');
  });

  it('shows a failure when the events cannot be loaded', async () => {
    const { component, page } = setup();
    page.mockRejectedValue(new Error('Events could not be loaded.'));
    await component.ngOnInit();
    expect(component['error']()).toBe('Events could not be loaded.');
    expect(component['loading']()).toBe(false);
  });

  it('shows a failure when an event cannot be saved', async () => {
    const { component, save, toast } = setup();
    await component.ngOnInit();
    component['open']();
    component['form'].patchValue({ title: 'Sports day' });
    save.mockRejectedValue(new Error('Event could not be saved.'));
    await component['save']();
    expect(component['error']()).toBe('Event could not be saved.');
    expect(toast).toHaveBeenCalledWith('Event could not be saved.', 'error');
    expect(component['dialogOpen']()).toBe(true);
  });

  it('sorts by the requested column and toggles the direction for the same column', async () => {
    const { component, page } = setup();
    await component.ngOnInit();
    await component['changeSort']('title');
    expect(component['sortBy']).toBe('title');
    expect(component['sortDirection']).toBe('asc');
    await component['changeSort']('title');
    expect(component['sortDirection']).toBe('desc');
    expect(page).toHaveBeenCalledWith(1, 5, expect.objectContaining({ sortBy: 'title', sortDirection: 'desc' }));
  });

  it('ignores an unsupported sort column', async () => {
    const { component, page } = setup();
    await component.ngOnInit();
    page.mockClear();
    await component['changeSort']('unknown');
    expect(page).not.toHaveBeenCalled();
    expect(component['sortBy']).toBe('eventDate');
  });
});
