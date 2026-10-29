import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';

@Component({
 selector:'app-column-filter',
 template:`<label><input [type]="type()" [attr.step]="type() === 'number' ? 'any' : null" [attr.aria-label]="'Filter ' + label()" [placeholder]="'Filter ' + label()" [value]="value()" (input)="changed.emit($any($event.target).value)" /><i class="pi pi-filter" aria-hidden="true"></i></label>`,
 styles:[`:host{display:block;min-width:110px}label{position:relative;display:block}input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:10px 34px 10px 12px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-card);color:var(--app-text);font:inherit}i{position:absolute;top:50%;right:10px;transform:translateY(-50%);color:var(--app-muted);pointer-events:none}input:focus-visible{outline:2px solid var(--app-primary);outline-offset:1px}`],
 changeDetection:ChangeDetectionStrategy.OnPush,
})
export class ColumnFilter {
 readonly label=input.required<string>();
 readonly type=input('search');
 readonly value=input('');
 readonly changed=output<string>();
}

/** Debounced query inputs only; never processes result rows. */
export function createColumnFilters(load:()=>void, invalidate:()=>void=()=>undefined) {
 const values=signal<Record<string,string>>({});
 let timer:ReturnType<typeof setTimeout>|undefined;
 const cancel=()=>clearTimeout(timer);
 inject(DestroyRef).onDestroy(cancel);
 return {
  values,
  set(key:string,value:string){values.update(v=>({...v,[key]:value}));cancel();invalidate();timer=setTimeout(load,250);},
  reset(){cancel();values.set({});load();},
  params(){cancel();return Object.fromEntries(Object.entries(values()).map(([k,v])=>['cf_'+k,v.trim()]));},
 };
}
