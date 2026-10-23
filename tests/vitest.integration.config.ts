import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
    testTimeout: 25000,
    hookTimeout: 25000,
    fileParallelism: false,
    env: {
      VITE_FIREBASE_PROJECT_ID: 'turnos-web-eb8b5',
      VITE_FIREBASE_STORAGE_BUCKET: 'turnos-web-eb8b5.firebasestorage.app',
      VITE_FIREBASE_AUTH_DOMAIN: 'turnos-web-eb8b5.firebaseapp.com',
    },
  },
});
