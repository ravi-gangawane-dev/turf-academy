import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationSectionNav } from './notification-section-nav';

describe('NotificationSectionNav', () => {
  let fixture: ComponentFixture<NotificationSectionNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationSectionNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationSectionNav);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('links to the standard notification views', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/notifications',
      '/notifications/events',
    ]);
  });

  it('hides the templates link by default', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.getAttribute('href') === '/notifications/templates')).toBe(false);
  });

  it('shows the templates link when requested', () => {
    fixture.componentRef.setInput('showTemplates', true);
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.getAttribute('href') === '/notifications/templates')).toBe(true);
  });
});
