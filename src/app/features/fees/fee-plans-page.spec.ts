import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { FeesService } from '../../core/supabase/domain-services';
import { FeePlansPage } from './fee-plans-page';

describe('Fee plan dialog', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('uses configured currency and restores focus after Escape, but stays open while saving', async () => {
    TestBed.configureTestingModule({
      imports: [FeePlansPage],
      providers: [provideRouter([]),
        { provide: FeesService, useValue: { plans: async () => [] } },
        { provide: AcademyPreferencesService, useValue: { currency: signal('USD'), load: async () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(FeePlansPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const opener: HTMLButtonElement = fixture.nativeElement.querySelector('app-page-hero .hero-action');
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Monthly fee (USD)');
    expect(document.activeElement).toBe(dialog.querySelector('input'));
    fixture.componentInstance['saving'].set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance['dialogOpen']()).toBe(true);
    fixture.componentInstance['saving'].set(false);
    fixture.detectChanges();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
