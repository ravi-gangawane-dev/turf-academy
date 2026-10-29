import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchResult, StaffDetailsService } from '../../core/supabase/staff-details.service';
@Component({selector:'app-search-page',imports: [PageHero, RouterLink],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<section class="search-page"><app-page-hero [breadcrumbs]="[{label:'Dashboard',route:'/dashboard'},{label:'Academy search'}]" title="Academy search" subtitle="Find students, parents, coaches and batches." /><p>Results for “{{query()}}” · Up to 20 matches per category</p>
 @if(loading()){<p role="status">Searching…</p>}@if(error()){<p role="alert">{{error()}}</p>}
 @for(kind of kinds;track kind){<section><h2>{{kind}}</h2>@for(row of results();track row.kind+row.id){@if(row.kind===kind){<a [routerLink]="row.kind==='batches'?['/batches']:['/'+row.kind,row.id]" [queryParams]="row.kind==='batches'?{batch:row.id}:{}"><strong>{{row.label}}</strong><span>{{row.detail}}</span></a>}}</section>}
 @if(!loading()&&!results().length){<p>{{query().length<2?'Enter at least two characters in the search box.':'No matching records.'}}</p>}</section>`,
 styles:[`.search-page{color:var(--app-text)}.search-page>section{background:var(--app-card);border:1px solid var(--app-border);border-radius:var(--app-radius-md);padding:20px;margin-top:16px}.search-page h2{text-transform:capitalize;margin-top:24px}.search-page a{display:flex;flex-wrap:wrap;gap:8px 20px;padding:12px;border-bottom:1px solid #e3eae5;color:#18563c}.search-page a span{color:#647469}`]})
export class SearchPage {
 private readonly api=inject(StaffDetailsService);private request=0;
 protected readonly kinds=['students','parents','coaches','batches'];
 protected readonly query=signal('');protected readonly results=signal<SearchResult[]>([]);protected readonly loading=signal(false);protected readonly error=signal('');
 constructor(){inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(params=>void this.search(params.get('q')?.trim()??''));}
 private async search(query:string){const request=++this.request;this.query.set(query);this.results.set([]);this.error.set('');this.loading.set(query.length>=2);if(query.length<2)return;
 try{const rows=await this.api.search(query);if(request===this.request)this.results.set(rows);}catch(e){if(request===this.request)this.error.set(e instanceof Error?e.message:'Search failed.');}finally{if(request===this.request)this.loading.set(false);}}
}
