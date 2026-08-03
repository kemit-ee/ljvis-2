# Data Mapper, DSL/handlebars transformation service, carrying this service's mappings.
# Multi-arch base pulled through the Harbor Docker Hub proxy.
# Pinned by digest because :alpha is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/datamapper:alpha
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/datamapper@sha256:91d53188a2e65b258ebdd7ad0b195d1a6b2b4b5b527bdaa0cf6d5219ee96a9b0
COPY DSL /data
COPY DSL/DMapper/ljvis/hbs /workspace/app/views/ljvis
