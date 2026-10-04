FROM node:22-alpine AS base
RUN npm install -g pnpm@12.6.0
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm db:generate

FROM deps AS build-users
RUN pnpm --filter @makkigo/users build

FROM deps AS build-valetagents
RUN pnpm --filter @makkigo/valetagents build

FROM node:22-alpine AS users
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3001
COPY --from=build-users --chown=node:node /repo/apps/users/.next/standalone ./
COPY --from=build-users --chown=node:node /repo/apps/users/.next/static ./apps/users/.next/static
COPY --from=build-users --chown=node:node /repo/apps/users/public ./apps/users/public
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "apps/users/server.js"]

FROM node:22-alpine AS valetagents
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build-valetagents --chown=node:node /repo/apps/valetagents/.next/standalone ./
COPY --from=build-valetagents --chown=node:node /repo/apps/valetagents/.next/static ./apps/valetagents/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/valetagents/server.js"]

FROM deps AS migrate
WORKDIR /repo/packages/database
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db execute --file prisma/init/init.sql"]
