# erru-xml-adapter — asynchronous ERRU 3.5 XML over HTTP inbound adapter, see README.md and
# docs/architecture/erru-async-xml.md. Same "no build tool, just javac" pattern as docker/nysiis
# and docker/xtr-mock: the only non-JDK dependency is the PostgreSQL JDBC driver (lib/), committed
# to the repo. The build verifies its SHA-256 before use; the runtime image copies the verified jar
# from the build stage.
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /build
COPY docker/erru-xml-adapter/src/ src/
COPY docker/erru-xml-adapter/lib/postgresql-42.7.4.jar lib/
RUN echo "188976721ead8e8627eb6d8389d500dccc0c9bebd885268a3047180274a6031e  lib/postgresql-42.7.4.jar" \
    | sha256sum -c -
COPY contracts/erru/3.5/ contracts/erru/3.5/
RUN javac -classpath lib/postgresql-42.7.4.jar -d out src/*.java \
    && java -classpath out:lib/postgresql-42.7.4.jar MapperSmokeTest

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /build/out/ /app/
COPY --from=build /build/lib/postgresql-42.7.4.jar /app/lib/
# contracts/erru/3.5 is the closed ERRU 3.5 XSD bundle already vendored in this repo; the image
# carries a copy so SchemaRegistry compiles the exact same schemas Newman/contract tests use.
COPY contracts/erru/3.5/ /app/contracts/erru/3.5/

EXPOSE 8080
ENTRYPOINT ["java", "-classpath", ".:lib/postgresql-42.7.4.jar", "ErruXmlAdapter"]
