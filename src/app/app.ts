import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DialogHost } from './shared/dialog/components/dialog-host/dialog-host';
import { ToastHost } from './shared/toast/toast-host';
import { PrintDocumentHost } from './shared/print/print-document-host/print-document-host';
import { PrintPreview } from './shared/print/print-preview/print-preview';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogHost, ToastHost, PrintDocumentHost, PrintPreview],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App { }
