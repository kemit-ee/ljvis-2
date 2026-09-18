# The Rust DataMapper renderer requires a literal `.hbs` extension;
# this DSL tree ships `.handlebars`. Rename in a throwaway stage so
# the source tree under DSL/ stays untouched.
FROM busybox:1.36-uclibc AS prep
COPY DSL/DMapper/ljvis /tmp/ljvis
RUN find /tmp/ljvis -name '*.handlebars' -exec sh -c 'mv "$1" "${1%.handlebars}.hbs"' _ {} \;

FROM turnerrainer/datamapper:0.2.1-alpha@sha256:b1286c486da7ddb033a76bf0fd95aa01c605332f8ed6d6b1e633810fa1d06eeb
COPY docker/data-mapper/datamapper.yaml /app/datamapper.yaml
COPY --from=prep /tmp/ljvis /app/DSL/ljvis

# No CMD override: the base image's own CMD is ["/app/datamapper"], run via
# its ENTRYPOINT (tini) as the non-root `datamapper` user. "datamapper" is
# NOT on PATH (only /app/datamapper exists), so a CMD of ["datamapper",
# "serve"] silently fails to exec — verified against the published image
# config, not just the release notes' "bare invocation resolves to serve"
# wording, which describes the binary's own argv handling, not a shell
# command name. We never pass positional args to this image, so there is
# nothing here for 0.2.0-alpha+'s CLI change to break.
