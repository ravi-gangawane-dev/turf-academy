import { defineConfig, devices } from '@playwright/test';

/**
 * Live Supabase Testing Configuration
 * Run with: npm run test:e2e:live
 * 
 * This config runs E2E tests against the real Supabase instance
 * with live test credentials. Use only for role-isolation, security,
 * and workflow verification tests.
 */
export default defineConfig({
    testDir: './e2e',
    testMatch: ['**/live-*.spec.ts', '**/role-isolation.spec.ts', '**/correction-workflow.spec.ts', '**/fee-plans.spec.ts', '**/vertical-slice.spec.ts'],
    timeout: 90_000,
    expect: { timeout: 15_000 },
    outputDir: 'test-results/live',
    testIgnore: '**/pwa/**',
    fullyParallel: false,
    workers: 1,
    retries: process.env['CI'] ? 2 : 0,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
    use: {
        baseURL: 'http://127.0.0.1:4202',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'npm start -- --configuration live --host 127.0.0.1 --port 4202',
        url: 'http://127.0.0.1:4202',
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000
    },
});
