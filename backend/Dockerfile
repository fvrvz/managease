# ── Stage 1: Base Runtime ─────────────────────────────────────────────────────
FROM ruby:3.3-slim AS base

WORKDIR /app

# Install minimal runtime dependencies (no compiler tools in base/prod)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    libvips42 \
    tzdata \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ── Stage 2: Builder (compilers & gem installation) ───────────────────────────
FROM base AS builder

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    libvips-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock* ./

RUN bundle config set --local jobs 4 && \
    bundle config set --local retry 3 && \
    bundle install

# ── Stage 3: Development ──────────────────────────────────────────────────────
FROM builder AS dev

COPY . .

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]

# ── Stage 4: Production ───────────────────────────────────────────────────────
FROM base AS production

ENV RAILS_ENV=production \
    RAILS_SERVE_STATIC_FILES=true \
    RAILS_LOG_TO_STDOUT=true \
    BUNDLE_WITHOUT="development:test"

# Copy installed gems from builder stage
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy application code
COPY . .

# Run as non-root user for security
RUN useradd -m -s /bin/bash rails && \
    mkdir -p log tmp storage && \
    chown -R rails:rails /app log tmp storage

USER rails

EXPOSE 3000

CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
