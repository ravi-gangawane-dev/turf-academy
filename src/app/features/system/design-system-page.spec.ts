import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesignSystemPage } from './design-system-page';

describe('DesignSystemPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  const render = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    return fixture;
  };

  it('should create', () => {
    const fixture = render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lists the available foundations', () => {
    const fixture = render();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Design System');
    expect(text).toContain('Colors and typography');
    expect(text).toContain('Components');
    expect(text).toContain('Accessibility');
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(3);
  });

  it('keeps the dashboard breadcrumb reachable', () => {
    const fixture = render();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('nav a');
    expect(link.getAttribute('href')).toBe('/dashboard');
  });
});
