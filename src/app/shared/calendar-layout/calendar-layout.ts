import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-calendar-layout',
  templateUrl: './calendar-layout.html',
  styleUrl: './calendar-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarLayout {}
