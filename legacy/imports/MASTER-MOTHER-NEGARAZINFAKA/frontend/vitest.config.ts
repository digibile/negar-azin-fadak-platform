import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Test configuration.
 *
 * The environment is `jsdom` because the client is a browser application: the states under test — an aborted
 * call on unmount, a session token held in `sessionStorage`, a redirect — only exist in a DOM. The setup file
 * installs the browser globals React 19 expects, so a failure here is a missing shim rather than a silent
 * difference from a real browser.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    restoreMocks: true,
  },
});
