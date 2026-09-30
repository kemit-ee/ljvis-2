# XTR, X-tee/Äriregister router. DSL/xtr is baked in so the deployed request
# definitions are locked to the same monorepo tag as ruuter and resql.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/xtr:0.4.1-rc
# turnerrainer/xtr:0.4.1-rc
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:54c452672b63aea7c752c6764bd42942154f9ac150d111ca683c6b0f3ad61f9f
COPY DSL/xtr /DSL
