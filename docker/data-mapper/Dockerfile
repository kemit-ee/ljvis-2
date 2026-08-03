# Data Mapper, Handlebars transformation service, carrying this service's mappings.
# Multi-arch base pulled through the Harbor Docker Hub proxy.
# Pinned by digest because :alpha is a moving tag. Refresh with:
#   docker buildx imagetools inspect turnerrainer/datamapper:alpha
FROM harbor.kemitaws.ee/dockerhub/turnerrainer/datamapper@sha256:91d53188a2e65b258ebdd7ad0b195d1a6b2b4b5b527bdaa0cf6d5219ee96a9b0
# dsl_path is set to /data/DMapper by the chart, which makes ljvis the project and
# ljvis/hbs/<view>.hbs the template. The whole DSL tree is copied so the layout matches
# the monorepo one-to-one.
COPY DSL /data
