# The Rust DataMapper renderer requires a literal `.hbs` extension;
# this DSL tree ships `.handlebars`. Rename in a throwaway stage so
# the source tree under DSL/ stays untouched.
FROM busybox:1.36-uclibc AS prep
COPY DSL/DMapper/ljvis /tmp/ljvis
RUN find /tmp/ljvis -name '*.handlebars' -exec sh -c 'mv "$1" "${1%.handlebars}.hbs"' _ {} \;

FROM turnerrainer/datamapper:0.2.1-alpha@sha256:b1286c486da7ddb033a76bf0fd95aa01c605332f8ed6d6b1e633810fa1d06eeb
COPY docker/data-mapper/datamapper.yaml /app/datamapper.yaml
COPY --from=prep /tmp/ljvis /app/DSL/ljvis

# 0.2.0-alpha+ resolves bare `datamapper` to the `serve` subcommand, but
# positional args after it no longer work — pin the subcommand explicitly
# so the CMD stays correct if that fallback ever changes upstream.
CMD ["datamapper", "serve"]
