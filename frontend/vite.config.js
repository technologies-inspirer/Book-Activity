import { cpSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const backendPort = Number(process.env.BACKEND_PORT || 3001);

export default defineConfig({
  base: '/Book-Activity/',
  publicDir: false,
  server: { watch: { ignored: [resolve(projectRoot, 'index.html').replace(/\\/g, '/'), '**/site-assets/**'] } },
  optimizeDeps: { entries: ['app.html'], include: ['react', 'react-dom', 'react-dom/client', 'jszip', 'pdfjs-dist'] },
  plugins: [
    react(),
    {
      name: 'development-html-entry',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = (request.url || '/').replace(/^\/Book-Activity\//, '/');
          if (path.startsWith('/api/')) {
            const proxy = http.request({ hostname: '127.0.0.1', port: backendPort, path, method: request.method, headers: request.headers }, upstream => {
              response.writeHead(upstream.statusCode, upstream.headers);
              upstream.pipe(response);
            });
            proxy.on('error', () => { if (!response.headersSent) response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'We could not connect. Please try again in a moment.' })); });
            request.pipe(proxy); return;
          }
          if (/^\/+(books|sounds|videos)\//i.test(path) && !/\.(js|json)(\?|$)/i.test(path)) {
            const proxy = http.request({ hostname: '127.0.0.1', port: backendPort, path: `/api/files${path}`, headers: request.headers }, upstream => {
              response.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(response);
            });
            proxy.on('error', () => { response.statusCode = 503; response.end('Media service unavailable'); });
            request.pipe(proxy); return;
          }
          next();
        });
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
      transformIndexHtml(html) {
        return html.replace(/\r\n?/g, '\n');
      },
      closeBundle() {
        const outputDir = resolve(projectRoot, 'dist');
        const html = resolve(outputDir, 'app.html');
        if (existsSync(html)) renameSync(html, resolve(outputDir, 'index.html'));
        // Keep the original paths, including optional locally supplied lesson videos.
        for (const directory of ['assets', 'books', 'sounds', 'videos']) {
          const source = resolve(projectRoot, directory);
          if (existsSync(source)) {
          cpSync(source, resolve(outputDir, directory), {
            recursive: true,
            // Imported books use page JPEGs; keep large original PDFs local.
            filter: path => directory !== 'books' || !/\.pdf$/i.test(path)
          });
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
          if (moduleId.includes('/node_modules/pdfjs-dist/')) return 'pdf-engine';
          if (/\/node_modules\/(jszip|pako|readable-stream|lie|immediate|setimmediate|core-util-is|inherits|isarray|process-nextick-args|safe-buffer|string_decoder|util-deprecate)\//.test(moduleId)) return 'authoring-vendor';
          const activityFile = moduleId.match(/\/books\/(activities[^/]+)\.js$/);
          if (activityFile) return activityFile[1];
          if (moduleId.includes('/node_modules/')) return 'vendor';
        }
      }
    }
  }
});
