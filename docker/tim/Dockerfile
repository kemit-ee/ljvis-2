# TIM 0.4.1+ on distroless (no shell, no apt, no tini, runs as UID 65532).
# Anything that needs a shell (RSA key generation, TARA-Mock CA hand-off) is
# done by the tim-init one-shot service (docker/tim/Dockerfile.init); TIM
# itself only gets the config file.
FROM turnerrainer/tim:0.4.1-alpha@sha256:8eadeb9075bd6b7ab948787e054178e6b072556c8a3197b258796d5a5a9e6117

COPY docker/tim/tim.yaml /app/tim.yaml
