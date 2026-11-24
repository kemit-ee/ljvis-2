FROM turnerrainer/ruuter:0.12.1-rc@sha256:2ab9ee4137bde226fa736d4f43a3f13fe55a6807f261bf62245f08e485b90ff3

# Upstream base is Debian 12 and lags behind security fixes (Trivy: libbrotli1
# CVE-2026-111497 etc.). Pull in the available Debian updates on top of the
# pinned image; the app files are unchanged.
USER root
RUN apt-get update -qq \
 && apt-get upgrade -y --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*
USER ruuter
RUN rm -rf /app/DSL/samples /app/DSL/guarded-demo
COPY DSL/Ruuter/ljvis /app/DSL/ljvis
COPY DSL/Ruuter/xtee-mock /app/DSL/xtee-mock
COPY constants.ini /app/constants.ini
COPY ruuter.yaml /app/ruuter.yaml
