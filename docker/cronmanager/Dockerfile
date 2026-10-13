# Release wrapper for CronManager. The scheduler configuration and job DSLs are
# baked into the image so they are versioned and promoted together.
ARG CRONMANAGER_IMAGE=harbor.kemitaws.ee/dockerhub/turnerrainer/cronmanager:0.1.4-alpha@sha256:429080e890699e11b7330487a04f55596023ef7c5601950716aa3694ceed0a75
FROM ${CRONMANAGER_IMAGE}

COPY --chown=cronmanager:cronmanager cronmanager.yaml /app/cronmanager.yaml
COPY --chown=cronmanager:cronmanager DSL/CronManager /app/DSL/jobs
