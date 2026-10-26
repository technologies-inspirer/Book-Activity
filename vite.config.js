import { cpSync, existsSync, renameSync } from 'node:fs';
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
      name: 'development-html-entry',
      configureServer(server) {
        // main/index.html is the published build. Development uses the source HTML.
        server.middlewares.use((request, _response, next) => {
          const [path, query] = (request.url || '/').split('?');
          if (['/', '/index.html', '/Book-Activity/', '/Book-Activity/index.html'].includes(path)) {
            request.url = `${path.startsWith('/Book-Activity/') ? '/Book-Activity' : ''}/app.html${query ? `?${query}` : ''}`;
          }
          next();
        });
      }
    },
    {
      name: 'copy-book-activity-assets',
      apply: 'build',
      closeBundle() {
        const outputDir = resolve(projectRoot, 'dist');
        const html = resolve(outputDir, 'app.html');
        if (existsSync(html)) renameSync(html, resolve(outputDir, 'index.html'));
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
    assetsDir: 'site-assets',
    rollupOptions: {
      input: resolve(projectRoot, 'app.html'),
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
