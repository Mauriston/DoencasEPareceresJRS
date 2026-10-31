import { defineConfig } from 'vitest/config';

// Testes unitários das regras puras (utils/), do mapa de rotas (config/) e do cliente de API (services/). Os testes E2E (e2e/) rodam à parte: npm run test:e2e.
export default defineConfig({
  test: {
    include: ['src/utils/**/*.test.ts', 'src/config/**/*.test.ts', 'src/services/**/*.test.ts'],
  },
});
