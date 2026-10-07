# XTR, X-tee/Äriregister router. DSL/xtr is baked in so the deployed request
# definitions are locked to the same monorepo tag as ruuter and resql.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/xtr:0.5.0-rc
# turnerrainer/xtr:0.5.0-rc
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:634b11471ff9c709f6b46cab18f7e85711d18df334a8b9a368f399a62bf1a9ca
COPY DSL/xtr /DSL
# LJVIS1 SOAP contract: WSDL + .soap.yaml (inbound SOAP → Ruuter.internal, schema-aware outbound).
# The deployed xtr.yaml must set wsdl_watch_dir: /wsdl and inbound.port / inbound.public_base_url.
COPY docker/xtr-inbound/wsdl /wsdl
# The image runs as the non-root xtr user: file modes of the build checkout must not decide
# whether it can read the contract (a 0600 WSDL makes XTR refuse to start).
USER root
RUN chmod -R a+rX /DSL /wsdl
USER xtr
