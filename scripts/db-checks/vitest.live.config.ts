import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// Live (real-database) checks. Deliberately NOT matched by the main vitest.config.ts include
// (src/**), so `vitest run` never touches the linked database. Run explicitly:
//   npx vitest run --config scripts/db-checks/vitest.live.config.ts
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/db-checks/**/*.live.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
