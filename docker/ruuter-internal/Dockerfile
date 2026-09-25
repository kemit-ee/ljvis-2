FROM turnerrainer/ruuter:0.10.1-rc@sha256:98ed90914d30d2e131cc194076c7047aba93727461c05da9bddbcc783880cb37
RUN rm -rf /app/DSL/samples
COPY DSL/Ruuter.internal/ljvis /app/DSL/ljvis
COPY constants.ini /app/constants.ini
COPY ruuter-internal.yaml /app/ruuter.yaml
