# Resql, SQL-to-REST service, carrying this service's Resql DSL.
# Multi-arch base pulled through the Harbor Docker Hub proxy.
# Pinned by digest because :alpha is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/resql:alpha
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/resql@sha256:bc61186507fed280684ff69304fd227cd6a8e06769e6e345fa2f8195383a60bc
COPY DSL/Resql /DSL
