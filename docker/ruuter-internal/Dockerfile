FROM turnerrainer/ruuter:0.9.7-rc@sha256:416640ce9c0694ed3a9856a1856fd337c3c73c128c2cf54133e53f74dffb0c58
RUN rm -rf /app/DSL/samples
COPY DSL/Ruuter.internal/ljvis /app/DSL/ljvis
COPY constants.ini /app/constants.ini
COPY ruuter-internal.yaml /app/ruuter.yaml
