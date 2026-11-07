# ── Stage 1: Base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

RUN npm install -g pnpm@9
WORKDIR /app

# ── Stage 2: Dependencies ─────────────────────────────────────────────────────
FROM base AS deps

COPY package.json .npmrc* ./
RUN pnpm install --no-frozen-lockfile

# ── Stage 3: Development ──────────────────────────────────────────────────────
FROM deps AS dev

COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

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

CMD ["nginx", "-g", "daemon off;"]
