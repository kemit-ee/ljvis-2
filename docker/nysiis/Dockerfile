# NYSIIS sidecar — wraps the official EC CommonServices jar (lib/), see README.md.
# No build tool needed: the jar's only dependency is the JDK itself.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build
COPY docker/nysiis/NysiisService.java .
COPY docker/nysiis/lib/EU.Cec.Move.CommonServices-1.9.1-Java11.jar lib/
RUN javac -classpath lib/EU.Cec.Move.CommonServices-1.9.1-Java11.jar NysiisService.java

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/NysiisService.class /app/
COPY --from=build /build/NysiisService\$HealthHandler.class /app/
COPY --from=build /build/NysiisService\$NysiisHandler.class /app/
COPY docker/nysiis/lib/EU.Cec.Move.CommonServices-1.9.1-Java11.jar /app/lib/

EXPOSE 8080
ENTRYPOINT ["java", "-classpath", ".:lib/EU.Cec.Move.CommonServices-1.9.1-Java11.jar", "NysiisService"]
