// tests/ghost/playwright.config.js
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    testDir: './scenarios', // Relative to this config file
    timeout: 180 * 1000, // 180s per test (Simulations take time)
    expect: {
        timeout: 10000 // 10s wait for UI elements
    },
    fullyParallel: false, // Sequential for Simulations to avoid DB collision
    forbidOnly: !!process.env.CI,
    retries: 0, // No retries, errors should be visible immediately
    workers: 1, // Single worker thread
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:5173',
        trace: 'on-first-retry',
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        headless: false, // Visual debugging
        launchOptions: {
            slowMo: 100, // Human-like speed
        },
        ignoreHTTPSErrors: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npx vite --port 5173 --strictPort --host 127.0.0.1',
        url: 'http://127.0.0.1:5173/',
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120 * 1000,
    }
});
