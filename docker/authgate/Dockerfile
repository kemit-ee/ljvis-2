# Autentimisvärav core-teenuste ees (#520, 3b). Vt README.md.
FROM nginx:alpine
COPY docker/authgate/nginx.conf.template docker/authgate/gate-proxy.conf /etc/authgate/
COPY docker/authgate/entrypoint.sh /usr/local/bin/authgate-entrypoint.sh
USER 101
ENTRYPOINT ["/usr/local/bin/authgate-entrypoint.sh"]
