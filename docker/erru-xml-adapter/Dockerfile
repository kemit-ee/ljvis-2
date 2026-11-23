# syntax=docker/dockerfile:1.7
# ERRU MOVEHUB 3.5 toor-XML sild: ametlik XTR >= 0.6.0-rc image (raw-XML lane'id + XSD-valideerimine,
# ei vaja enam kohalikku Rust-ehitust ega paigatud binaari) + ERRU 3.5 XSD-d + lane'i sidecar.
# Kasutusel olev xtr.yaml ja per-keskkonna `erru.xml.yaml` (URL-id) tulevad chart'i ConfigMap'ist
# (devops charts/erru-xml-adapter) ja asendavad siin küpsetatud dev-koopia.
ARG XTR_RUNTIME_IMAGE=turnerrainer/xtr@sha256:babfaa902d09772af77caca0f7daa18f7ef7991e62e619a6ca8769f59b9f9c0b
FROM ${XTR_RUNTIME_IMAGE}
USER root
COPY contracts/erru/3.5/*.xsd /erru/wsdl/erru/
COPY docker/erru-xml-adapter/xml/erru.xml.yaml /erru/wsdl/erru/erru.xml.yaml
# Sama mitte-root loetavuse reegel nagu docker/xtr/Dockerfile.
RUN mkdir -p /erru/DSL && chmod -R a+rX /erru /erru/wsdl
USER xtr
