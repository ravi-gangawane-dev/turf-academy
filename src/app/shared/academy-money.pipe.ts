import { CurrencyPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { AcademyPreferencesService } from '../core/supabase/academy-preferences.service';
@Pipe({name:'academyMoney',pure:false})
export class AcademyMoneyPipe implements PipeTransform {
 private readonly preferences=inject(AcademyPreferencesService);
 private readonly pipe=new CurrencyPipe('en-IN');
 transform(value:number|string|null|undefined,display='symbol',digits='1.2-2'):string|null{return this.pipe.transform(value,this.preferences.currency(),display,digits);}
}
