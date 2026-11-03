# syntax=docker/dockerfile:1

# REA currently requires a recent Node 22 release. Keep build and runtime on
# the same major line so the MCP child process has the same Node environment.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY *.ts ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install only runtime dependencies; REA itself is launched by npx at runtime.
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
USER node
EXPOSE 8787

# The health endpoint returns 200 only after REA has connected and exposed tools.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.AI_CORE_PORT || 8787) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
