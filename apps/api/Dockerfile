FROM node:22-alpine AS build
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages packages
COPY database database

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
RUN pnpm --filter @naf/api build

FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

COPY --from=build /workspace /app

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh","-c","pnpm --filter @naf/api migrate && pnpm --filter @naf/api start"]
