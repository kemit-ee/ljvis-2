# NYSIIS sidecar

Wraps the **official European Commission** `EU.Cec.Move.CommonServices` library
(`lib/EU.Cec.Move.CommonServices-1.9.1-Java11.jar`) behind a tiny HTTP service, so Ruuter
DSL (JS/YAML only, no JVM) can call it over the network like any other backend service.

## Why this exists (do not reimplement NYSIIS)

`.ai/ERRU_DOCS/MOVEHUB Transliteration and NYSIIS Package/Move Hub Transliteration and
NYSIIS Package-v2.09.pdf` §4 states explicitly:

> "The MS shall use the NYSIIS implementation provided by the EC through the libraries or
> services and **must not create their own implementation** of the NYSIIS algorithm."

This is a hard requirement of the ERRU network, not a style preference — every member
state's NYSIIS search key for the same name must be byte-identical, otherwise CGR name
searches silently stop matching across countries. The jar in `lib/` is the exact binary
distributed by the EC (see the same folder in `.ai/ERRU_DOCS/` for the `.nupkg` .NET
equivalent and the PDF spec). Verified against the EC's own simulated test data
(`.ai/ERRU_DOCS/.../MS Test Pack 3.19/Simulated Test Data/ErruTestData.xml`):
`Aachen` → `ACAN`, `Petra` → `PATR` — both reproduced exactly by this sidecar.

## API

`POST /nysiis`
```json
{"name": "Aachen", "useFullName": true}
```
→
```json
{"searchKey": "ACAN"}
```

`useFullName=true` computes the key over the whole string (used for the family name,
which may be multi-word); `false` computes it over just the first word (used for the
first name). This mirrors `CommonServices.getNYSIISSearchKey(name, useFullName)` exactly
— see the PDF §4: "The Family name search key should be calculated on the complete name
string... The First name search key should be calculated on the first first name."

`GET /health` → `200 ok`.

## Why a bespoke HTTP server instead of a framework

The wrapper only needs one endpoint and the jar's only dependency is the JDK itself, so
`com.sun.net.httpserver.HttpServer` (built into the JDK, zero extra dependencies) keeps
the image minimal — no Maven/Gradle build step, just `javac` + `java` in the Dockerfile.
