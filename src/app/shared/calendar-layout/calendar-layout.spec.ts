import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarLayout } from './calendar-layout';

@Component({
  imports: [CalendarLayout],
  template: `<app-calendar-layout>
    <div calendar-main>Month grid</div>
    <div calendar-sidebar>Agenda</div>
  </app-calendar-layout>`,
})
class Host {}

describe('CalendarLayout', () => {
  let fixture: ComponentFixture<CalendarLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarLayout);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('projects the main grid and the sidebar into their own regions', () => {
    const host = TestBed.createComponent(Host);
    host.detectChanges();
    const main: HTMLElement = host.nativeElement.querySelector('main');
    const aside: HTMLElement = host.nativeElement.querySelector('aside');
    expect(main.textContent).toContain('Month grid');
    expect(aside.textContent).toContain('Agenda');
  });
});
