import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination page sizes', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('defaults to five rows and offers exactly the standard sizes', () => {
    const fixture = TestBed.createComponent(Pagination);
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.value).toBe('5');
    expect(Array.from(select.options, option => option.value)).toEqual(['5', '10', '20', '50', '100']);
  });

  for (const size of [5, 10, 20, 50, 100]) {
    it(`displays the current ${size}-row size and emits a selected replacement`, () => {
      const fixture = TestBed.createComponent(Pagination);
      fixture.componentRef.setInput('pageSize', size);
      fixture.componentRef.setInput('total', 100);
      fixture.detectChanges();
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      expect(select.value).toBe(String(size));
      const changed = vi.fn();
      fixture.componentInstance.pageSizeChange.subscribe(changed);
      select.value = size === 20 ? '5' : '20';
      select.dispatchEvent(new Event('change'));
      expect(changed).toHaveBeenCalledExactlyOnceWith(size === 20 ? 5 : 20);
      expect(fixture.componentInstance.pageSizeOptions).toEqual([5, 10, 20, 50, 100]);
    });
  }
});
