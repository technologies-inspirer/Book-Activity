import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/Book-Activity/',
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'copy-book-activity-assets',
      apply: 'build',
      closeBundle() {
        const outputDir = resolve(projectRoot, 'dist');
        // Keep the original paths, including optional locally supplied lesson videos.
        for (const directory of ['assets', 'books', 'sounds', 'videos']) {
          const source = resolve(projectRoot, directory);
          if (existsSync(source)) {
            cpSync(source, resolve(outputDir, directory), { recursive: true });
          }
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, '/');
          const activityFile = moduleId.match(/\/books\/(activities[^/]+)\.js$/);
          if (activityFile) return activityFile[1];
          if (moduleId.includes('/node_modules/')) return 'vendor';
        }
      }
    }
  }
});
