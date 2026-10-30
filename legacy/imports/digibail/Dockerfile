FROM node:22-alpine
ENV NODE_ENV=production PORT=1631 HOST=0.0.0.0
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node server.js start.js migrate.js next-server.js next.config.mjs ./
COPY --chown=node:node backend ./backend
COPY --chown=node:node scripts/create-admin.js ./scripts/create-admin.js
COPY --chown=node:node scripts/migrate-legacy-digibail.js ./scripts/migrate-legacy-digibail.js
COPY --chown=node:node scripts/provision-recovery-admin.js ./scripts/provision-recovery-admin.js
COPY --chown=node:node scripts/import-legacy-loan-products.mjs ./scripts/import-legacy-loan-products.mjs
COPY --chown=node:node scripts/backfill-legacy-customers.mjs ./scripts/backfill-legacy-customers.mjs
COPY --chown=node:node web ./web
COPY --chown=node:node app ./app
RUN npm run build && chown -R node:node .next
COPY --chown=node:node frontend ./frontend
USER node
EXPOSE 1631
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:1631/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","next-server.js"]
