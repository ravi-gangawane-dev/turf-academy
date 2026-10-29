import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DataTable } from './data-table';
import { Pagination } from '../pagination/pagination';

describe('DataTable', () => {
  let component: DataTable;
  let fixture: ComponentFixture<DataTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the total supplied by the parent', () => {
    fixture.componentRef.setInput('total', 42);
    fixture.detectChanges();
    expect(component.total).toBe(42);
  });

  it('passes the paging inputs down to the nested pager', () => {
    fixture.componentRef.setInput('total', 30);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('itemLabel', 'payments');
    fixture.detectChanges();

    const pager = fixture.debugElement.query(By.directive(Pagination)).componentInstance as Pagination;
    expect(pager.total).toBe(30);
    expect(pager.page).toBe(2);
    expect(pager.pageSize).toBe(10);
    expect(pager.itemLabel).toBe('payments');
  });

  it('forwards pagination changes raised by the nested pager', () => {
    const pageChange = vi.fn();
    const pageSizeChange = vi.fn();
    component.pageChange.subscribe(pageChange);
    component.pageSizeChange.subscribe(pageSizeChange);
    fixture.detectChanges();

    const pager = fixture.debugElement.query(By.directive(Pagination)).componentInstance as Pagination;
    pager.pageChange.emit(3);
    pager.pageSizeChange.emit(20);
    expect(pageChange).toHaveBeenCalledWith(3);
    expect(pageSizeChange).toHaveBeenCalledWith(20);
  });
});
