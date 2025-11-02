FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# install deps
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
# only copy package json for improved caching layer
COPY apps/api/package.json apps/api/package.json
COPY apps/webapp/package.json apps/webapp/package.json
COPY packages/prisma-wrapper/package.json packages/prisma-wrapper/package.json
RUN pnpm install --frozen-lockfile

# build app
FROM deps AS build
COPY . .
# generate prisma client
RUN pnpm --dir packages/prisma-wrapper exec prisma generate
RUN pnpm --filter ./packages/prisma-wrapper run build
# build api and webapp
RUN pnpm --filter ./apps/webapp run build
RUN pnpm --filter ./apps/api run build
# pruned prod-workspace for api (pnpm v10 legacy deploy)
RUN pnpm deploy --filter ./apps/api --prod --legacy /app/standalone

# runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# prunend workspace
COPY --from=build /app/standalone ./
# build artifacts
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/webapp/dist ./apps/webapp/dist
EXPOSE 3000
# volume for RSA-Keys 
VOLUME ["/app/keys"]
ENV PORT=3000
CMD ["node", "apps/api/dist/main.js"]