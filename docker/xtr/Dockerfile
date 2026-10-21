# syntax=docker/dockerfile:1.7
# Build the upstream SOAP XML fix until an upstream image includes it.
# Source: turnerrainer/XTR commit 025d80e6df2890cae2ea5da6233347ce84806d9c.
ARG XTR_RUNTIME_IMAGE=harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:634b11471ff9c709f6b46cab18f7e85711d18df334a8b9a368f399a62bf1a9ca
FROM rust:1.88-slim AS xtr-builder
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev patch \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
ADD --checksum=sha256:1332d946d428c77792c6c103c683a4cb228ff8431307035a3c839d62b7ccd2fb \
    https://github.com/turnerrainer/XTR/archive/025d80e6df2890cae2ea5da6233347ce84806d9c.tar.gz /tmp/xtr.tar.gz
RUN tar -xzf /tmp/xtr.tar.gz --strip-components=1 -C /build && rm /tmp/xtr.tar.gz
COPY docker/xtr/predefined-xml-entities.patch /tmp/predefined-xml-entities.patch
RUN patch -p1 < /tmp/predefined-xml-entities.patch \
    && cargo test --locked --lib translate::xml_to_json::tests \
    && cargo build --locked --release --bin xtr-on-rust

# Keep the existing runtime, entrypoint, certificates and non-root user.
FROM ${XTR_RUNTIME_IMAGE}
COPY --from=xtr-builder /build/target/release/xtr-on-rust /app/xtr-on-rust
COPY DSL/xtr /DSL
# LJVIS1 SOAP contract: WSDL + .soap.yaml (inbound SOAP → Ruuter.internal, schema-aware outbound).
# The deployed xtr.yaml must set wsdl_watch_dir: /wsdl and inbound.port / inbound.public_base_url.
COPY docker/xtr-inbound/wsdl /wsdl
# The image runs as the non-root xtr user: file modes of the build checkout must not decide
# whether it can read the contract (a 0600 WSDL makes XTR refuse to start).
USER root
RUN chmod -R a+rX /DSL /wsdl
USER xtr
