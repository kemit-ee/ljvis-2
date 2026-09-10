# XTR, X-tee/Äriregister router. DSL/xtr is baked in so the deployed request
# definitions are locked to the same monorepo tag as ruuter and resql.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/xtr:rc
# turnerrainer/xtr:0.3.0-rc
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:f4c5b562903f15e50f7832ce4d41cae01c91514cf476c7e5745f23260fa5e308
COPY DSL/xtr /DSL
