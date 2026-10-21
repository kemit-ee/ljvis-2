FROM turnerrainer/ruuter:0.12.1-rc@sha256:2ab9ee4137bde226fa736d4f43a3f13fe55a6807f261bf62245f08e485b90ff3
RUN rm -rf /app/DSL/samples
COPY DSL/Ruuter.internal/ljvis /app/DSL/ljvis
COPY constants.ini /app/constants.ini
COPY ruuter-internal.yaml /app/ruuter.yaml
