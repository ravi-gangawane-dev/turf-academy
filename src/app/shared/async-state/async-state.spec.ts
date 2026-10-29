import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsyncState } from './async-state';

describe('AsyncState', () => {
  let component: AsyncState;
  let fixture: ComponentFixture<AsyncState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsyncState],
    }).compileComponents();

    fixture = TestBed.createComponent(AsyncState);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Loading payments...');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('announces a polite status while loading', () => {
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    expect(section.getAttribute('role')).toBe('status');
    expect(section.classList.contains('error')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Loading payments...');
  });

  it('announces errors assertively', () => {
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('message', 'Payments could not be loaded.');
    fixture.detectChanges();
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    expect(section.getAttribute('role')).toBe('alert');
    expect(section.classList.contains('error')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Payments could not be loaded.');
  });

  it('emits the action when the retry button is pressed', () => {
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);
    fixture.componentRef.setInput('actionLabel', 'Retry');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('Retry');
    button.click();
    expect(action).toHaveBeenCalledOnce();
  });

  it('hides the action button when no label is supplied', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
