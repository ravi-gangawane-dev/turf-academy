import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PrintIdCardDocument } from '../print-document.models';

@Component({
  selector: 'app-print-id-card',
  imports: [DatePipe],
  templateUrl: './print-id-card.html',
  styleUrl: './print-id-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintIdCard {
  readonly card = input.required<PrintIdCardDocument>();

  protected readonly copies = [0, 1];

  protected kindLabel(): string {
    const type = this.card().holderType;
    return type === 'coach' ? 'Coach ID' : type === 'parent' ? 'Guardian ID' : 'Student ID';
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
