import { Injectable, signal } from '@angular/core';
export interface ToastMessage{readonly id:string;readonly kind:'success'|'error'|'warning'|'info';readonly text:string;}
@Injectable({providedIn:'root'})export class ToastService{readonly messages=signal<readonly ToastMessage[]>([]);show(text:string,kind:ToastMessage['kind']='info'):void{const id=crypto.randomUUID();this.messages.update(items=>[...items,{id,text,kind}]);setTimeout(()=>this.dismiss(id),5000);}dismiss(id:string):void{this.messages.update(items=>items.filter(item=>item.id!==id));}}
