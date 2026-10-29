import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SummaryMetricCard } from './summary-metric-card';

describe('SummaryMetricCard', () => {
  let fixture: ComponentFixture<SummaryMetricCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryMetricCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryMetricCard);
    fixture.componentRef.setInput('label', 'Net collection');
    fixture.componentRef.setInput('value', '₹1.2L');
    fixture.componentRef.setInput('icon', 'pi-wallet');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the label, value and hint', () => {
    fixture.componentRef.setInput('hint', 'After refunds');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Net collection');
    expect(fixture.nativeElement.textContent).toContain('₹1.2L');
    expect(fixture.nativeElement.textContent).toContain('After refunds');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('article')).toBeTruthy();
  });

  it('falls back to a dash when the value is missing', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('strong')?.textContent?.trim()).toBe('—');
  });

  it('becomes a link when a route is supplied', () => {
    fixture.componentRef.setInput('route', '/payments');
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/payments');
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
  });

  it('applies the requested tone', () => {
    fixture.componentRef.setInput('tone', 'purple');
    fixture.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('.metric-card');
    expect(card.classList.contains('purple')).toBe(true);
  });
});
