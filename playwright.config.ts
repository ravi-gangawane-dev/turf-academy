import { defineConfig, devices } from '@playwright/test';

// Keep mock tests isolated from a developer's app on 4200 and live tests on 4202.
const port = 4203;

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    '**/account-recovery.spec.ts',
    '**/pwa/**',
    '**/live-*.spec.ts',
    '**/role-isolation.spec.ts',
    '**/correction-workflow.spec.ts',
    '**/fee-plans.spec.ts',
    '**/vertical-slice.spec.ts',
  ],
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results/mock',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm start -- --configuration e2e --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    // The Angular dev server prefers an inherited PORT environment variable over
    // the --port flag (it binds a random port when PORT=0), which makes this
    // readiness wait time out. Pin PORT so the CLI-specified port always wins.
    env: { ...process.env, PORT: String(port) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
