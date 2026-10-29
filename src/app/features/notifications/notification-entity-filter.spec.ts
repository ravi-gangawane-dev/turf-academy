import { TestBed } from '@angular/core/testing';
import { NotificationsService } from '../../core/supabase/domain-services';
import { NotificationEntityFilter } from './notification-entity-filter';

describe('Notification entity choices', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('loads choices lazily, restores exact selection and retries errors', async () => {
    const filterOptions = vi.fn().mockResolvedValue([{ value: 'one', label: 'Aarav · one' }]);
    TestBed.configureTestingModule({
      providers: [{ provide: NotificationsService, useValue: { filterOptions } }],
    });
    const fixture = TestBed.createComponent(NotificationEntityFilter);
    fixture.componentRef.setInput('kind', 'student');
    fixture.componentRef.setInput('label', 'students');
    fixture.detectChanges();
    expect(filterOptions).not.toHaveBeenCalled();
    fixture.componentRef.setInput('value', 'one');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(filterOptions).toHaveBeenCalledWith('student', '', 'one');
    expect(fixture.nativeElement.querySelector('select').value).toBe('one');
    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    const select = fixture.nativeElement.querySelector('select');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(changed).toHaveBeenCalledWith('');
    filterOptions.mockRejectedValueOnce(new Error('Offline'));
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'Test';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choices unavailable');
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Choices unavailable');
  });
  it('ignores late responses from an older search', async () => {
    let resolveOld!: (value: { value: string; label: string }[]) => void;
    const filterOptions = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
      )
      .mockResolvedValue([{ value: 'new', label: 'New match' }]);
    TestBed.configureTestingModule({
      providers: [{ provide: NotificationsService, useValue: { filterOptions } }],
    });
    const fixture = TestBed.createComponent(NotificationEntityFilter);
    fixture.componentRef.setInput('kind', 'student');
    fixture.componentRef.setInput('label', 'students');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 300));
    input.value = 'New';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fixture.detectChanges();
    resolveOld([{ value: 'old', label: 'Old match' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('New match');
    expect(fixture.nativeElement.textContent).not.toContain('Old match');
  });
});
