# Ruuter, public router. Multi-arch base pulled through the Harbor Docker Hub proxy.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/ruuter:rc
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/ruuter@sha256:bfdf6e385c34a44aed783a6889d3e1a57389c445a704e6e2cf94964e399b5202
COPY DSL/Ruuter/ljvis /DSL/ljvis
