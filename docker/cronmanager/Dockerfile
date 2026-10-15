# Release wrapper for CronManager. The scheduler configuration and job DSLs are
# baked into the image so they are versioned and promoted together.
ARG CRONMANAGER_IMAGE=harbor.kemitaws.ee/dockerhub/turnerrainer/cronmanager:0.2.3-alpha@sha256:622a469f4b0bd4429e1b1c4b7d5adf3cade449a9575af5f2fa9f6847b3b72c7b
FROM ${CRONMANAGER_IMAGE}

COPY --chown=cronmanager:cronmanager cronmanager.yaml /app/cronmanager.yaml
COPY --chown=cronmanager:cronmanager DSL/CronManager /app/DSL/jobs
