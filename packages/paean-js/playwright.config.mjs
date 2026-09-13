import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser', timeout: 30000, fullyParallel: true, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure', launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
