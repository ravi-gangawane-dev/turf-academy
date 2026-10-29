import { defineConfig } from '@playwright/test';
import live from './playwright.live.config';

// Recovery credentials must never be captured in browser artifacts.
export default defineConfig({
  ...live,
  testMatch: '**/account-recovery.spec.ts',
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results/recovery',
  use: { ...live.use, trace: 'off', screenshot: 'off', video: 'off' },
});
