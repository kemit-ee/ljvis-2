# XTR, X-tee/Äriregister router. DSL/xtr is baked in so the deployed request
# definitions are locked to the same monorepo tag as ruuter and resql.
# Pinned by digest because :rc is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/xtr:0.5.0-rc
# turnerrainer/xtr:0.5.0-rc
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/xtr@sha256:634b11471ff9c709f6b46cab18f7e85711d18df334a8b9a368f399a62bf1a9ca
COPY DSL/xtr /DSL
