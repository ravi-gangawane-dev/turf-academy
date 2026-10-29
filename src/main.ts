import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { clearResetBusinessState } from './app/core/state/reset-business-state';

clearResetBusinessState().then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
