const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './test/e2e', timeout: 60000, workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3101', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'node test/support/browser-server.cjs', url: 'http://127.0.0.1:3101/api/operations/health', timeout: 60000, reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 } },
});
