import { defineConfig } from 'vitest/config';

// Testes unitários das regras puras (utils/). Os testes E2E (e2e/) rodam à parte: npm run test:e2e.
export default defineConfig({
  test: {
    include: ['utils/**/*.test.ts'],
  },
});
