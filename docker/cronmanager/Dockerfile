# Release wrapper for CronManager. The scheduler configuration and job DSLs are
# baked into the image so they are versioned and promoted together.
ARG CRONMANAGER_IMAGE=harbor.kemitaws.ee/dockerhub/turnerrainer/cronmanager:0.2.4-alpha@sha256:3ab67dc6adc68b927ff00454dd9c24fb8f61e907b57621f885a220c7d3228cd6
FROM ${CRONMANAGER_IMAGE}

COPY --chown=cronmanager:cronmanager cronmanager.yaml /app/cronmanager.yaml
COPY --chown=cronmanager:cronmanager DSL/CronManager /app/DSL/jobs
