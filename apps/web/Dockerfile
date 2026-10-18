# build stage
FROM node:22-alpine AS build

RUN npm install -g pnpm@10.33.2

WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml /repo/
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @cadence/web...

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BACKEND_URL

RUN pnpm --filter @cadence/web build


# runtime stage
FROM node:22-alpine AS runtime

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public


USER node
EXPOSE 3000
CMD [ "node","apps/web/server.js" ]