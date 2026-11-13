import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoachesPage } from './coaches-page';

describe('CoachesPage', () => {
  let component: CoachesPage;
  let fixture: ComponentFixture<CoachesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachesPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows phone and email in separate coach table columns with independent filters', () => {
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead tr:first-child th') as NodeListOf<HTMLElement>,
    ).map((header) => header.textContent?.trim().replace(/\s*↕$/, ''));
    const filters = Array.from(
      fixture.nativeElement.querySelectorAll('thead tr.column-filters app-column-filter') as NodeListOf<HTMLElement>,
    ).map((filter) => filter.getAttribute('label'));

    expect(headers).toContain('Phone');
    expect(headers).toContain('Email');
    expect(headers).not.toContain('Contact');
    expect(filters).toContain('phone');
    expect(filters).toContain('email');
  });
});
