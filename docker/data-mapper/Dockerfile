# The Rust DataMapper renderer requires a literal `.hbs` extension;
# this DSL tree ships `.handlebars`. Rename in a throwaway stage so
# the source tree under DSL/ stays untouched.
FROM busybox:1.36-uclibc AS prep
COPY DSL/DMapper/ljvis /tmp/ljvis
RUN find /tmp/ljvis -name '*.handlebars' -exec sh -c 'mv "$1" "${1%.handlebars}.hbs"' _ {} \;

FROM turnerrainer/datamapper:0.1.3-alpha@sha256:cc73f953cfdd45e2f7f6d1360e4dbfdad4249e0fb16916f3e1cbe99883cb6cc8
COPY docker/data-mapper/datamapper.yaml /app/datamapper.yaml
COPY --from=prep /tmp/ljvis /app/DSL/ljvis
