// Les tests doivent pouvoir importer page.tsx, qui utilise l'alias « @/ » comme le reste de
// l'application. Sans cette résolution, tester ce que l'étiquette AFFICHE (mechOf) est
// impossible — et c'est justement là que se cachait le prix faux du multi-achat.
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
