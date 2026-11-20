FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npm run prisma:generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app/backend
COPY --from=build --chown=node:node /app/backend/package.json ./
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/generated ./generated
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --from=build --chown=node:node /app/backend/prisma ./prisma
COPY --chown=node:node frontend /app/frontend
COPY --chown=node:node deploy/container-entrypoint.sh /app/entrypoint.sh
COPY --chown=node:node deploy/start-hosted.sh /app/start-hosted.sh
COPY --chown=node:node deploy/healthcheck.cjs /app/healthcheck.cjs
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD ["node", "/app/healthcheck.cjs"]
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["node", "dist/main.js"]
