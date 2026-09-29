# ERRU Hub mock — dev/CI ONLY. See ErruHubMock.java javadoc: there is no real Hub connectivity in
# this project yet, so erru-xml-adapter's delivery role needs somewhere to POST to.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build
COPY docker/erru-hub-mock/ErruHubMock.java .
COPY docker/erru-xml-adapter/src/SchemaRegistry.java docker/erru-xml-adapter/src/XmlUtil.java docker/erru-xml-adapter/src/ResponseValidator.java ./
RUN javac *.java

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/*.class /app/
COPY contracts/erru/3.5/ /app/contracts/erru/3.5/

EXPOSE 8080
ENTRYPOINT ["java", "-classpath", ".", "ErruHubMock"]
