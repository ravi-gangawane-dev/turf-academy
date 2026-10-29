import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademySupport } from './academy-support';
import { API_CONFIG } from '../core/config/api.config';

describe('AcademySupport', () => {
  let fixture: ComponentFixture<AcademySupport>;

  const configure = async (academySupport?: {
    readonly phone: string;
    readonly displayPhone: string;
    readonly email: string;
    readonly whatsapp: string;
    readonly hours: string;
  }) => {
    await TestBed.configureTestingModule({
      imports: [AcademySupport],
      providers: [{ provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false, academySupport } }],
    }).compileComponents();
    fixture = TestBed.createComponent(AcademySupport);
    fixture.detectChanges();
  };

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await configure();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('links every configured support channel', async () => {
    await configure({
      phone: '+919876543210',
      displayPhone: '+91 98765 43210',
      email: 'support@turfacademy.in',
      whatsapp: '919876543210',
      hours: 'Mon-Sat, 8:00 AM-7:00 PM',
    });
    const element: HTMLElement = fixture.nativeElement;
    const links = Array.from(element.querySelectorAll('a'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'tel:+919876543210',
      'mailto:support@turfacademy.in',
      'https://wa.me/919876543210',
    ]);
    expect(element.textContent).toContain('+91 98765 43210');
    expect(element.textContent).toContain('Mon-Sat, 8:00 AM-7:00 PM');
  });

  it('falls back to an office message when no support details are configured', async () => {
    await configure(undefined);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('a').length).toBe(0);
    expect(element.textContent).toContain('Contact the academy office for assistance.');
  });
});
