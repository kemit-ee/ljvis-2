FROM turnerrainer/ruuter:0.9.10-rc@sha256:45c370254ce44d8fd947e89d1ad87df4be72ef5ab0e69a025f43de90419649f2
RUN rm -rf /app/DSL/samples
COPY DSL/Ruuter.internal/ljvis /app/DSL/ljvis
COPY constants.ini /app/constants.ini
COPY ruuter-internal.yaml /app/ruuter.yaml
