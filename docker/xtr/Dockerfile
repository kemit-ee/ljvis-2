# XTR, X-tee/Äriregister router. DSL/xtr is baked in so the deployed request
# definitions are locked to the same monorepo tag as ruuter and resql.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/xtr:rc
# turnerrainer/xtr:0.2.0-rc.1
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:f0e40e2a0b12091cf204d7ee633b29d6e58e90e19501286d7b7dde0ed3b641c2
COPY DSL/xtr /DSL
