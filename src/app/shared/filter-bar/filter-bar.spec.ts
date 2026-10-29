import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  let component: FilterBar;
  let fixture: ComponentFixture<FilterBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterBar],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the search term as the user types', () => {
    const searchChange = vi.fn();
    component.searchChange.subscribe(searchChange);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Ravi';
    input.dispatchEvent(new Event('input'));
    expect(searchChange).toHaveBeenCalledWith('Ravi');
  });

  it('emits a reset request', () => {
    const reset = vi.fn();
    component.resetFilters.subscribe(reset);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Reset');
    button.click();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('can hide the search field', () => {
    fixture.componentRef.setInput('showSearch', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });

  it('applies the accessible label and placeholder', () => {
    fixture.componentRef.setInput('searchLabel', 'Search students');
    fixture.componentRef.setInput('placeholder', 'Name or code');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-label')).toBe('Search students');
    expect(input.getAttribute('placeholder')).toBe('Name or code');
  });
});
