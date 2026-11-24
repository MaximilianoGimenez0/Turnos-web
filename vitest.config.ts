import { defineConfig, type Plugin } from 'vitest/config';

// On Windows with a lowercase drive-letter CWD (e.g. d:\...), Vite uppercases
// `config.root` while Node loads Vitest workers with the lowercase path, causing
// `/node_modules/vitest/...` imports to instantiate a second @vitest/runner copy.
// Rewriting resolved vitest ids to match the CWD drive letter makes Vitest hit
// its own `normalizedDistDir` cache path with the same file:// URL as the worker.
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
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
  },
});
