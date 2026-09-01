# XTR, X-tee/Äriregister router. DSL/xtr is baked in so the deployed request
# definitions are locked to the same monorepo tag as ruuter and resql.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/xtr:rc
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:61d441d00f7597ab5e17204c9b59568d4845047bd32d5846ecca22a179db6fcf
COPY DSL/xtr /DSL
