FROM turnerrainer/ruuter:0.9.12-rc@sha256:7a9405e2e4ee9ed37b128fdaf77b29d4c8ef0a3a73cb01ce8bec31846f7f5e2e
RUN rm -rf /app/DSL/samples
COPY DSL/Ruuter.internal/ljvis /app/DSL/ljvis
COPY constants.ini /app/constants.ini
COPY ruuter-internal.yaml /app/ruuter.yaml
