# React build served by nginx. Both bases are multi-arch and pulled through the Harbor
# Docker Hub proxy. nginx.conf also reverse-proxies /api/ -> ruuter and /tim/ -> tim,
# so those Service names must match the charts' fullnameOverride.
FROM harbor.kemitaws.ee/dockerhub/library/node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM harbor.kemitaws.ee/dockerhub/library/nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
