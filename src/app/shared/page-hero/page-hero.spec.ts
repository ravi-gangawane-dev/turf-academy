import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHero } from './page-hero';

@Component({
  imports: [PageHero],
  template: `<form (submit)="submitted = true">
    <app-page-hero title="Family" actionLabel="Add" (action)="actions = actions + 1">
      <label hero-actions>Child<select><option>Asha</option><option>Ravi</option></select></label>
      <button hero-details type="button" (click)="details = details + 1">View details</button>
    </app-page-hero>
  </form>`,
})
class Host {
  submitted = false;
  actions = 0;
  details = 0;
}

describe('PageHero reuse', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders navigable ancestors and a non-interactive current breadcrumb', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PageHero);
    fixture.componentRef.setInput('title', 'Student details');
    fixture.componentRef.setInput('breadcrumbs', [
      { label: 'Dashboard', route: '/dashboard' }, { label: 'Students' }, { label: 'Student details' },
    ]);
    fixture.detectChanges();
    const selected = vi.fn();
    fixture.componentInstance.breadcrumbSelected.subscribe(selected);
    expect(fixture.nativeElement.querySelector('nav a').getAttribute('href')).toBe('/dashboard');
    const current: HTMLElement = fixture.nativeElement.querySelector('[aria-current="page"]');
    expect(current.tagName).toBe('SPAN');
    current.click();
    expect(selected).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('nav button').click();
    expect(selected).toHaveBeenCalledWith('Students');
  });

  it('disables actions while busy and uses supplied branding', () => {
    const fixture = TestBed.createComponent(PageHero);
    fixture.componentRef.setInput('title', 'Plans');
    fixture.componentRef.setInput('actionLabel', 'Save');
    fixture.componentRef.setInput('quote', 'Train together.');
    fixture.componentRef.setInput('brandName', 'River Academy');
    fixture.componentRef.setInput('actionLoading', true);
    fixture.detectChanges();
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.hero-action');
    button.click();
    expect(action).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('River Academy');
    expect(fixture.nativeElement.textContent).not.toContain('Turf Cricket Academy');
    fixture.componentRef.setInput('actionLoading', false);
    fixture.componentRef.setInput('actionDisabled', true);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    fixture.componentRef.setInput('actionDisabled', false);
    fixture.detectChanges();
    button.click();
    expect(action).toHaveBeenCalledOnce();
  });

  it('preserves projected controls and never submits its containing form', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.hero-action').click();
    fixture.nativeElement.querySelector('[hero-details]').click();
    expect(fixture.componentInstance.actions).toBe(1);
    expect(fixture.componentInstance.details).toBe(1);
    expect(fixture.componentInstance.submitted).toBe(false);
    expect(fixture.nativeElement.querySelector('.hero-controls select').options.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
  });
});
