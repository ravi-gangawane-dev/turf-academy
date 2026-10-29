import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnFilter } from './column-filter';

describe('ColumnFilter', () => {
  let component: ColumnFilter;
  let fixture: ComponentFixture<ColumnFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnFilter);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'student');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('labels the input for assistive technology', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-label')).toBe('Filter student');
    expect(input.getAttribute('placeholder')).toBe('Filter student');
    expect(input.getAttribute('type')).toBe('search');
    expect(input.getAttribute('step')).toBeNull();
  });

  it('allows any decimal step for numeric filters', () => {
    fixture.componentRef.setInput('type', 'number');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('step')).toBe('any');
  });

  it('emits the typed value', () => {
    const changed = vi.fn();
    component.changed.subscribe(changed);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Ravi';
    input.dispatchEvent(new Event('input'));
    expect(changed).toHaveBeenCalledWith('Ravi');
  });

  it('reflects the supplied value', () => {
    fixture.componentRef.setInput('value', 'Asha');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('Asha');
  });
});
