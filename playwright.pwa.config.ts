import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/pwa',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4300', ...devices['Desktop Chrome'] },
  webServer: { command: 'npm run serve:prod', url: 'http://127.0.0.1:4300', reuseExistingServer: false, timeout: 60_000 },
});
