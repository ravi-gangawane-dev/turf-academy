import { TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('Shared status meanings', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each([
    ['Absent', 'absent', 'danger'],
    ['checked_out', 'checked out', 'success'],
    [' PARTIALLY_REFUNDED ', 'partially refunded', 'warning'],
    ['Sent', 'sent', 'warning'],
    ['not-marked', 'not marked', 'info'],
    ['custom_state', 'custom state', 'info'],
  ])('renders %s with a readable label and appropriate variant', (status, label, variant) => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    const badge: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(badge.textContent).toBe(label);
    expect(badge.className).toBe(variant);
    expect(badge.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
  });
});
