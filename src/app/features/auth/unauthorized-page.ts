import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-unauthorized-page', imports: [RouterLink], templateUrl:'./unauthorized-page.html', styleUrl:'./unauthorized-page.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class UnauthorizedPage { }
