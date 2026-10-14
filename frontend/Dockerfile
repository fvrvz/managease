FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN pnpm install --no-frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

FROM deps AS builder
COPY . .
RUN pnpm build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
