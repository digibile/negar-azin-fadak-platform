FROM node:22-bookworm-slim AS build
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

FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-fas \
 && tesseract --list-langs | grep -qx fas \
 && tesseract --list-langs | grep -qx eng \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /workspace /app

ENV NODE_ENV=production
ENV OCR_TESSERACT_PATH=/usr/bin/tesseract
ENV OCR_LANGUAGES=fas+eng

USER node
CMD ["node","apps/api/dist/ocr-worker.js"]
