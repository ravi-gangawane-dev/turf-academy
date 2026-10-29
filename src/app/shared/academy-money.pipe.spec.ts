import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AcademyPreferencesService } from '../core/supabase/academy-preferences.service';
import { AcademyMoneyPipe } from './academy-money.pipe';
describe('Academy currency',()=>{
 it('preserves decimals and reflects a saved currency change for the same amount',()=>{
  const currency=signal('INR');TestBed.configureTestingModule({providers:[AcademyMoneyPipe,{provide:AcademyPreferencesService,useValue:{currency}}]});
  const pipe=TestBed.inject(AcademyMoneyPipe);expect(pipe.transform(1250.5)).toBe('₹1,250.50');currency.set('USD');expect(pipe.transform(1250.5)).toContain('1,250.50');expect(pipe.transform(1250.5)).not.toContain('₹');
 });
});
