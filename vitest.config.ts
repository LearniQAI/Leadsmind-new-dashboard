import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // The default 5s budget flaked under full-suite parallel load (this suite runs inside the Vercel
    // build, so a flake fails a deploy). Measured on a clean full run: jsdom render tests up to ~2.2s
    // and some plain Node tests up to ~3.2s, with load spikes pushing single tests past 5s. 30s is a
    // wide margin over real durations; a genuinely hung test still fails, just later.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'libs/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'src/scratch'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/modules/**', 'src/shared/**', 'src/lib/**'],
      exclude: ['src/scratch', 'node_modules'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
      },
    },
  },
});
