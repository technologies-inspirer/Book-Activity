FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build && rm -rf dist/books dist/videos dist/sounds

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend/src ./src
COPY --chown=node:node backend/scripts ./scripts
COPY --chown=node:node backend/migrations ./migrations
COPY --chown=node:node backend/data ./data
COPY --from=frontend-build --chown=node:node /app/frontend/dist /app/frontend/dist
COPY --from=frontend-build --chown=node:node /app/frontend/books /app/frontend/books
COPY --from=frontend-build --chown=node:node /app/frontend/sounds /app/frontend/sounds
COPY --chown=node:node frontend/src/data /app/frontend/src/data
RUN mkdir -p /app/backend/.local /app/frontend/videos && chown -R node:node /app/backend/.local /app/frontend/videos
USER node
EXPOSE 3001
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/api/health/db').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
