FROM node:24-bookworm-slim AS verify
WORKDIR /app
COPY package.json server.mjs auth.mjs seating.mjs app.js admin.js ./
COPY index.html admin.html styles.css admin.css favicon.svg ./
COPY assets/ ./assets/
COPY data/content.json ./data/content.json
COPY deploy/ ./deploy/
COPY tests/ ./tests/
RUN npm run check && npm test && node --check deploy/start.mjs && node --check deploy/healthcheck.mjs

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/var/lib/boda/data \
    UPLOAD_DIR=/var/lib/boda/uploads
WORKDIR /app
RUN mkdir -p /var/lib/boda/data /var/lib/boda/uploads && chown -R node:node /var/lib/boda
COPY --from=verify --chown=node:node /app /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "deploy/healthcheck.mjs"]
CMD ["node", "deploy/start.mjs"]
