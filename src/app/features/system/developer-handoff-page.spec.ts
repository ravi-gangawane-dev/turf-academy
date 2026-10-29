import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DeveloperHandoffPage } from './developer-handoff-page';

describe('DeveloperHandoffPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  const render = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(DeveloperHandoffPage);
    fixture.detectChanges();
    return fixture;
  };

  it('should create', () => {
    const fixture = render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('publishes the verification commands for each project check', () => {
    const fixture = render();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Developer Handoff');
    expect(text).toContain('npm run build');
    expect(text).toContain('npm test -- --watch=false');
    expect(text).toContain('playwright.live.config.ts');
    expect(text).toContain('supabase test db');
  });

  it('renders one row per documented check', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelectorAll('dl > div').length).toBe(4);
  });

  it('links back to the dashboard from the breadcrumb', () => {
    const fixture = render();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('nav a');
    expect(link.getAttribute('href')).toBe('/dashboard');
  });
});
