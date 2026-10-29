import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudentListService, StudentWorkspace } from '../students/student-list.service';
import { ParentChildProfilePage } from './parent-child-profile-page';

describe('Parent child payment total', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('uses the full net payment aggregate rather than the visible payment page', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: StudentListService, useValue: {} }] });
    const page = TestBed.createComponent(ParentChildProfilePage).componentInstance;
    // The service aggregate includes partial/full refunds and payments outside page one.
    page['data'].set({ paymentAmount: 1188.99, payments: [{ amount: 100, status: 'successful' }] } as unknown as StudentWorkspace);
    expect(page['totalPaid']()).toBe(1188.99);
    page['data'].set({ paymentAmount: 0, payments: [{ amount: 100, status: 'refunded' }] } as unknown as StudentWorkspace);
    expect(page['totalPaid']()).toBe(0);
  });
});
