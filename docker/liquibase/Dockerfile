# Liquibase migration runner. Multi-arch base via the Harbor Docker Hub proxy; built
# arm64 because it is deployed as a standalone PreSync hook Job, not inside the
# resql-ljvis pod.
FROM harbor.kemitaws.ee/dockerhub/liquibase/liquibase:4.29.2

COPY DSL/Liquibase/ /liquibase/
