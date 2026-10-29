import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StaffDetailsService } from '../../core/supabase/staff-details.service';
import { SearchPage } from './search-page';

function setup(query: string, search = vi.fn()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of(convertToParamMap(query ? { q: query } : {})) },
      },
      { provide: StaffDetailsService, useValue: { search } },
    ],
  });
  const fixture = TestBed.createComponent(SearchPage);
  fixture.detectChanges();
  return { fixture, search };
}

describe('SearchPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { fixture } = setup('');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('asks for at least two characters instead of searching', async () => {
    const { fixture, search } = setup('a');
    await fixture.whenStable();
    expect(search).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter at least two characters');
  });

  it('searches the academy and groups the results by record kind', async () => {
    const { fixture, search } = setup('Aarav', vi.fn().mockResolvedValue([
      { kind: 'students', id: 's1', label: 'Aarav Sharma', detail: 'ST-1' },
      { kind: 'coaches', id: 'c1', label: 'Anita Rao', detail: 'U-10' },
    ]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(search).toHaveBeenCalledWith('Aarav');
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('Anita Rao');
    expect(fixture.nativeElement.querySelectorAll('h2').length).toBe(4);
  });

  it('reports that nothing matched', async () => {
    const { fixture } = setup('Aarav', vi.fn().mockResolvedValue([]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching records.');
  });

  it('surfaces a search failure to the user', async () => {
    const { fixture } = setup('Aarav', vi.fn().mockRejectedValue(new Error('Search is unavailable.')));
    await fixture.whenStable();
    fixture.detectChanges();
    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Search is unavailable.');
  });
});
