import { ComponentFixture, TestBed } from '@angular/core/testing';
import { effect, signal } from '@angular/core';
import { ToastHost } from './toast-host';
import { ToastService } from './toast.service';

describe('ToastHost', () => {
  let fixture: ComponentFixture<ToastHost>;
  let toast: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastHost],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastHost);
    toast = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(ToastService).clear();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('announces messages in a polite live region', () => {
    const region: HTMLElement = fixture.nativeElement.querySelector('.toasts');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('renders the raised toasts', () => {
    toast.show('Payment recorded.', 'success');
    fixture.detectChanges();
    const articles = fixture.nativeElement.querySelectorAll('article');
    expect(articles.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Payment recorded.');
    expect(articles[0].classList.contains('toast-success')).toBe(true);
  });

  it('dismisses a toast when its button is pressed', () => {
    toast.show('Payment recorded.', 'success');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('article button');
    expect(button.getAttribute('aria-label')).toBe('Dismiss');
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(0);
    expect(toast.messages().length).toBe(0);
  });

  it('keeps effect-published feedback dismissed until the source changes', () => {
    const feedback = signal('Student checked in.');
    TestBed.runInInjectionContext(() => effect(() => toast.success(feedback())));
    TestBed.tick();
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('article button');
    button.click();
    TestBed.tick();
    fixture.detectChanges();
    expect(toast.messages()).toEqual([]);
    expect(fixture.nativeElement.querySelector('article')).toBeNull();

    toast.info('Unrelated update');
    TestBed.tick();
    expect(toast.messages().map(item => item.text)).toEqual(['Unrelated update']);

    feedback.set('Student checked out.');
    TestBed.tick();
    expect(toast.messages().map(item => item.text)).toEqual([
      'Unrelated update', 'Student checked out.',
    ]);
  });
  it('dismisses the current toast after replacing an earlier message', async () => {
    toast.success('Earlier message');
    fixture.detectChanges();
    toast.clear();
    toast.success('Current message');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('article button');
    button.querySelector('i')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(toast.messages()).toEqual([]);
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
  });

});
