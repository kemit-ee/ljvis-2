FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/ljvis-security-headers.conf
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
# Käivituskasutaja on nginx. Kirjutatavad on ainult nginx-i vahemälu ja /run (= /var/run:
# pid ja käivitusaegne config.json) — samad kaks kataloogi, mille k8s read-only
# juurfailisüsteemi korral emptyDir-iga asendab. `user` direktiiv eemaldatakse, sest
# seda saab kasutada ainult juurkasutajana käivitatud peaprotsess.
RUN sed -i '/^user /d' /etc/nginx/nginx.conf \
    && chown -R 101:101 /var/cache/nginx /run
# Numbriline UID (nginx), et k8s saaks runAsNonRoot nõuet kontrollida.
USER 101:101
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
