# Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client with correct binary targets
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create startup script with direct SQL migration
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Running migrations..."' >> /app/start.sh && \
    echo 'cd /app && node_modules/.bin/prisma migrate deploy 2>/dev/null || echo "Prisma migrate skipped"' >> /app/start.sh && \
    echo 'echo "Applying SQL patches..."' >> /app/start.sh && \
    echo 'if [ -n "$DATABASE_URL" ]; then' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS phone TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS email TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS address TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS city TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS tax_number TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS tax_office TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "ALTER TABLE caries ADD COLUMN IF NOT EXISTS notes TEXT;" 2>/dev/null || true' >> /app/start.sh && \
    echo '  psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT, updated_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "Running seed..."' >> /app/start.sh && \
    echo 'node prisma/seed.js 2>/dev/null || echo "Seed skipped"' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
