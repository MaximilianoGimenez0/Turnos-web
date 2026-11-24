import { defineConfig, type Plugin } from 'vitest/config';

const alignVitestDriveCaseOnWindows = (): Plugin => ({
  name: 'align-vitest-drive-case-on-windows',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (process.platform !== 'win32' || !/^@?vitest(?:\/|$)/.test(source)) {
      return null;
    }
    const cwdDrive = process.cwd()[0];
    if (!cwdDrive || cwdDrive === cwdDrive.toUpperCase()) {
      return null;
    }
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    if (resolved && /^[A-Z]:/.test(resolved.id) && resolved.id[0].toLowerCase() === cwdDrive) {
      return { ...resolved, id: cwdDrive + resolved.id.slice(1) };
    }
    return resolved;
  },
});

export default defineConfig({
  plugins: [alignVitestDriveCaseOnWindows()],
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
