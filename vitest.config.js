import { defineConfig } from 'vitest/config';

// Pruebas del JavaScript del navegador (lógica pura, en Node). Aparte de vite.config.js
// para no cargar el plugin de Laravel al probar.
export default defineConfig({
    test: {
        include: ['tests/js/**/*.test.js'],
        environment: 'node',
        restoreMocks: true,
    },
});
