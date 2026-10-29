import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryCards } from './summary-cards';

describe('SummaryCards', () => {
  let fixture: ComponentFixture<SummaryCards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryCards],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryCards);
    fixture.componentRef.setInput('cards', [
      { label: 'Students', value: 120, icon: 'pi-users' },
      { label: 'Collection', value: '₹1.2L', icon: 'pi-wallet', hint: 'This month', tone: 'blue' },
    ]);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one metric card per summary entry', () => {
    const cards = fixture.nativeElement.querySelectorAll('app-summary-metric-card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Students');
    expect(fixture.nativeElement.textContent).toContain('₹1.2L');
    expect(fixture.nativeElement.textContent).toContain('This month');
  });

  it('labels the summary group', () => {
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    expect(section.getAttribute('aria-label')).toBe('Summary');
    fixture.componentRef.setInput('ariaLabel', 'Fee overview');
    fixture.detectChanges();
    expect(section.getAttribute('aria-label')).toBe('Fee overview');
  });
});
