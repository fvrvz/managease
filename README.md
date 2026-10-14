# ManagEase

A Jira-like Kanban project management app built with:

- **Frontend**: SolidJS + Vite + TypeScript + lucide-solid
- **Backend**: Ruby on Rails 8 (API mode) + Devise + JWT + OmniAuth OIDC
- **Database**: PostgreSQL 16
- **API Docs**: Swagger / rswag
- **Monorepo**: pnpm workspaces
- **Infrastructure**: Docker Compose

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- pnpm ≥ 9 (for local frontend dev)
- Node.js ≥ 20

### 1. Clone & configure

```bash
git clone <repo-url> managease
cd managease
cp .env.example .env
# Edit .env — at minimum set a strong SECRET_KEY_BASE and JWT_SECRET
```

### 2. Start all services

```bash
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:3000
- Swagger UI → http://localhost:3000/api-docs

### 3. Local frontend dev (optional, faster HMR)

```bash
pnpm install
VITE_API_BASE_URL=http://localhost:3000 pnpm dev
```

---

## Auth

### Local (default)

- Register at `/register`
- Login at `/login`
- JWT tokens stored in `localStorage` (refreshed every 24h by default)

### OIDC / OAuth2 (Google, Keycloak, Auth0, etc.)

Set these in `.env`:

```env
OIDC_ENABLED=true
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
OIDC_ISSUER=https://accounts.google.com       # or Keycloak/Auth0 URL
OIDC_REDIRECT_URI=http://localhost:3000/auth/oidc/callback
```

When `OIDC_ENABLED=true` the "Sign in with SSO" button appears on the login page.

---

## Excel Import

1. Navigate to **Project Settings → Import**
2. Upload a `.xlsx` file
3. Map columns to fields (Issue title, type, status, priority, story points, epic, sprint, assignee)
4. Click **Import** — issues, epics and sprints are created automatically

---

## API Documentation

Swagger UI is available at: `http://localhost:3000/api-docs`

---

## Project Structure

```
managease/
├── frontend/       SolidJS app
├── backend/        Rails 8 API
├── nginx/          Reverse-proxy config (production)
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

---

## Development Commands

```bash
# Run all tests
docker compose exec backend bundle exec rspec

# Rails console
docker compose exec backend bundle exec rails console

# Generate Swagger docs
docker compose exec backend bundle exec rake rswag:specs:swaggerize

# DB migrations
docker compose exec backend bundle exec rails db:migrate
```

