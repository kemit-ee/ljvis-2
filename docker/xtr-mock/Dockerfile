# XTR mock sidecar — CI ONLY (see XtrMock.java). No build tool, no dependencies:
# a single JDK HttpServer class, same approach as docker/nysiis.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build
COPY docker/xtr-mock/XtrMock.java .
RUN javac XtrMock.java

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/*.class /app/
EXPOSE 8080
ENTRYPOINT ["java", "-classpath", ".", "XtrMock"]
