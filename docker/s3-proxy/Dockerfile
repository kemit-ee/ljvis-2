FROM node:22-alpine
WORKDIR /app
COPY docker/s3-proxy/package.json .
RUN npm install --production
COPY docker/s3-proxy/server.js .
EXPOSE 3010
CMD ["node", "server.js"]
