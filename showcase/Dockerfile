# ── Stage 1: Base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

RUN npm install -g pnpm@9
WORKDIR /app

# ── Stage 2: Dependencies ─────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm install --no-frozen-lockfile

# ── Stage 3: Development ──────────────────────────────────────────────────────
FROM deps AS dev

COPY . .
EXPOSE 5174
CMD ["pnpm", "dev", "--host", "--port", "5174"]

# ── Stage 4: Builder ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .
RUN pnpm build

# ── Stage 5: Production ───────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Standard SPA fallback & gzip compression config
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 --start-period=3s \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
