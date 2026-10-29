import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortableHeader } from './sortable-header';

describe('SortableHeader', () => {
  let component: SortableHeader;
  let fixture: ComponentFixture<SortableHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SortableHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(SortableHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sortKey', 'student');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits its sort key when activated', () => {
    const sortChange = vi.fn();
    component.sortChange.subscribe(sortChange);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(sortChange).toHaveBeenCalledWith('student');
  });

  it('marks only the active column as pressed', () => {
    fixture.componentRef.setInput('activeSort', 'student');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows the current direction for the active column', () => {
    fixture.componentRef.setInput('activeSort', 'student');
    fixture.componentRef.setInput('direction', 'asc');
    fixture.detectChanges();
    const indicator: HTMLElement = fixture.nativeElement.querySelector('.table-sort-indicator');
    expect(indicator.textContent?.trim()).toBe('↑');
  });

  it('shows the descending arrow for descending active columns', () => {
    fixture.componentRef.setInput('activeSort', 'student');
    fixture.componentRef.setInput('direction', 'desc');
    fixture.detectChanges();
    const indicator: HTMLElement = fixture.nativeElement.querySelector('.table-sort-indicator');
    expect(indicator.textContent?.trim()).toBe('↓');
  });

  it('shows a neutral indicator for inactive columns', () => {
    const indicator: HTMLElement = fixture.nativeElement.querySelector('.table-sort-indicator');
    expect(indicator.textContent?.trim()).toBe('↕');
  });
});
