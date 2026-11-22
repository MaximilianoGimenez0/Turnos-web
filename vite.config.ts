import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase-firestore',
              test: /node_modules[\\/](@?firebase)[\\/]firestore/,
              includeDependenciesRecursively: false,
              priority: 25,
            },
            {
              name: 'firebase-core',
              test: /node_modules[\\/](@?firebase)[\\/](app|auth|functions|component|logger|util|webchannel-wrapper)/,
              includeDependenciesRecursively: false,
              priority: 20,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|framer-motion)[\\/]/,
              priority: 15,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
