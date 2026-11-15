import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsTabs } from './settings-tabs';

describe('SettingsTabs', () => {
  afterEach(() => TestBed.resetTestingModule());

  function render() {
    TestBed.configureTestingModule({
      imports: [SettingsTabs],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(SettingsTabs);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the same settings tabs on every page', () => {
    const fixture = render();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.section-tabs a'),
    ) as HTMLAnchorElement[];

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'All Settings',
      'Profile',
      'Operations',
      'Attendance',
      'Notifications',
      'Print & Documents',
      'Users & Roles',
      'Audit Log',
      'Tools & Data',
    ]);
    expect(links[0].getAttribute('href')).toBe('/settings');
    expect(links.at(-1)?.getAttribute('href')).toBe('/settings/tools');
  });
});
