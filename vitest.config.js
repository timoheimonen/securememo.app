import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text-summary', 'json', 'lcov'],
      reportsDirectory: 'coverage',
      provider: 'v8'
    }
  }
});
