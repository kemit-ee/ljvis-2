FROM node:22-alpine
WORKDIR /app
COPY docker/s3-proxy/package.json .
RUN npm install --production
COPY docker/s3-proxy/server.js .
# Turvaaudit 2026-11: mitte-root kasutaja; production-režiim ei lekita stacktrace'e.
ENV NODE_ENV=production
USER node
EXPOSE 3010
CMD ["node", "server.js"]
