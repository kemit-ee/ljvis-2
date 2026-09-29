import javax.xml.XMLConstants;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import javax.xml.transform.Source;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One {@link Schema} per ERRU message-entry XSD (docs/architecture/erru-async-xml.md §3): merging
 * several entry files into a single Schema via SchemaFactory.newSchema(Source[]) is unsafe
 * (Xerces intermittently drops a root element declaration). Each entry file is fully
 * self-contained via its own xs:include chain, so there is no reason to merge them — a given
 * HTTP delivery is always exactly one message type.
 *
 * Also carries the XXE hardening: FEATURE_SECURE_PROCESSING, no external DTD/schema access, and a
 * resolver that refuses to leave the bundle directory.
 */
final class SchemaRegistry {

    /** The 5 inbound Request root types this ingress recognises. */
    static final String[] REQUEST_ENTRY_FILES = {
            "CheckGoodRepute_Request.xsd",
            "CheckTransportUndertakingData_Request.xsd",
            "RoadSideInspection_Request.xsd",
            "NotifyCheckResult_Request.xsd",
            "NotifyUnfitness_Request.xsd",
    };

    /**
     * Our own outbound Response/Acknowledgement root types — not accepted from the wire at
     * ingress (isKnownRoot() only reflects REQUEST_ENTRY_FILES for that purpose, see
     * IngressHandler), but compiled here too so ProcessingWorker can self-validate the XML it
     * generates before ever writing it to erru.xml_outbox, catching a mapper bug before it is
     * ever sent to the Hub rather than after.
     */
    static final String[] RESPONSE_ENTRY_FILES = {
            "CheckGoodRepute_Response.xsd",
            "CheckTransportUndertakingData_Response.xsd",
            "RoadSideInspection_Response.xsd",
            "NotifyCheckResult_Response.xsd",
            "NotifyCheckResult_Acknowledgement.xsd",
            "NotifyUnfitness_Acknowledgement.xsd",
            // ErrorNotification is the actual protocol answer for "no real business answer is
            // possible" — self-validated the same way as every other
            // outbound message, via ErrorNotificationBuilder.
            "ErrorNotification.xsd",
    };

    private final Map<String, Schema> schemaByRootName = new LinkedHashMap<>();
    private final java.util.Set<String> requestRootNames = new java.util.HashSet<>();
    private final XMLInputFactory xmlInputFactory;

    SchemaRegistry(Path bundleDir) throws Exception {
        for (String entryFile : REQUEST_ENTRY_FILES) {
            String rootName = entryFile.substring(0, entryFile.length() - ".xsd".length());
            requestRootNames.add(rootName);
        }
        for (String entryFile : concat(REQUEST_ENTRY_FILES, RESPONSE_ENTRY_FILES)) {
            Path p = bundleDir.resolve(entryFile);
            if (!Files.isRegularFile(p)) {
                throw new IllegalStateException("missing ERRU contract file: " + p);
            }
            String rootName = entryFile.substring(0, entryFile.length() - ".xsd".length());
            schemaByRootName.put(rootName, compileOne(bundleDir, p));
        }

        // Hardened: no DTDs, no external entities, while peeking just the root element's local
        // name (a cheap streaming check, not a full parse).
        xmlInputFactory = XMLInputFactory.newInstance();
        xmlInputFactory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        xmlInputFactory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        xmlInputFactory.setProperty(XMLInputFactory.IS_REPLACING_ENTITY_REFERENCES, false);
    }

    /**
     * Cheap streaming peek at the document's root element local name. Never a full DOM parse.
     * Takes raw bytes, not a pre-decoded String, so the parser itself honours a UTF-8 BOM and an
     * explicit `encoding="..."` declaration.
     *
     * Rejects anything that isn't UTF-8. Every ERRU 3.5 XSD declares encoding="utf-8", the stored
     * raw_xml is a UTF-8 TEXT column, and ProcessingWorker re-parses it from a String — so
     * non-UTF-8 input would be mangled or fail after the Hub had already been told 202.
     * `reader.getEncoding()` is the encoding actually used to decode the stream (BOM-detected or
     * declared).
     *
     * Also rejects any DOCTYPE, here and not in validate(): a javax.xml.validation.Validator over a
     * StreamSource accepts an internal DTD and expands its entities even with
     * "disallow-doctype-decl" set (that feature only affects SAX/DOM parsers). Rejecting the DTD
     * event during this peek happens before validate() ever runs.
     */
    synchronized String peekRootLocalName(byte[] xml) throws Exception {
        XMLStreamReader reader = xmlInputFactory.createXMLStreamReader(new java.io.ByteArrayInputStream(xml));
        try {
            while (reader.hasNext()) {
                int event = reader.next();
                if (event == XMLStreamConstants.DTD) {
                    throw new IllegalArgumentException("DOCTYPE is not permitted");
                }
                if (event == XMLStreamConstants.START_ELEMENT) {
                    String encoding = reader.getEncoding();
                    if (encoding != null && !encoding.equalsIgnoreCase("UTF-8")) {
                        throw new IllegalArgumentException("unsupported encoding (only UTF-8 is accepted): " + encoding);
                    }
                    return reader.getLocalName();
                }
            }
            throw new IllegalArgumentException("no root element found");
        } finally {
            reader.close();
        }
    }

    /** True only for the 5 inbound Request types — what IngressHandler is allowed to accept from the wire. */
    boolean isKnownRoot(String rootLocalName) {
        return requestRootNames.contains(rootLocalName);
    }

    private static String[] concat(String[] a, String[] b) {
        String[] r = new String[a.length + b.length];
        System.arraycopy(a, 0, r, 0, a.length);
        System.arraycopy(b, 0, r, a.length, b.length);
        return r;
    }

    /** Self-validating our own generated XML (outbound ACKs) — no encoding ambiguity, it's already a Java String. */
    void validate(String rootLocalName, String xml) throws Exception {
        validate(rootLocalName, new StreamSource(new StringReader(xml)));
    }

    /**
     * Validating wire input: raw bytes, not a pre-decoded String, so the validator's own parser
     * honours a BOM / `encoding="..."` declaration.
     */
    void validate(String rootLocalName, byte[] xml) throws Exception {
        validate(rootLocalName, new StreamSource(new java.io.ByteArrayInputStream(xml)));
    }

    /** Throws SAXException on the first validation error (fail-fast). */
    private void validate(String rootLocalName, Source source) throws Exception {
        Schema schema = schemaByRootName.get(rootLocalName);
        if (schema == null) {
            throw new IllegalArgumentException("unsupported root element: " + rootLocalName);
        }
        Validator validator = schema.newValidator();
        validator.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        validator.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        validator.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        // No "disallow-doctype-decl" here on purpose: it has no effect on a Validator over a
        // StreamSource. DOCTYPE rejection is in peekRootLocalName's XMLStreamConstants.DTD check,
        // which runs before this method for wire input.
        validator.setErrorHandler(new FailFastErrorHandler(rootLocalName));
        validator.validate(source);
    }

    private static Schema compileOne(Path bundleDir, Path entryFile) throws Exception {
        SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setErrorHandler(new FailFastErrorHandler(entryFile.getFileName().toString()));
        factory.setResourceResolver(new BundleOnlyResolver(bundleDir));
        Source[] sources = { new StreamSource(entryFile.toFile()) };
        return factory.newSchema(sources);
    }

    /** Refuses to resolve xs:include targets outside the bundle directory, or non-file resources. */
    private static final class BundleOnlyResolver implements org.w3c.dom.ls.LSResourceResolver {
        private final Path dir;
        BundleOnlyResolver(Path dir) { this.dir = dir; }

        @Override
        public org.w3c.dom.ls.LSInput resolveResource(String type, String namespaceURI, String publicId,
                                                        String systemId, String baseURI) {
            if (systemId == null) {
                return null;
            }
            Path resolved = dir.resolve(systemId).normalize();
            if (!resolved.startsWith(dir)) {
                throw new SecurityException("refusing to resolve outside the bundle directory: " + systemId);
            }
            if (!Files.isRegularFile(resolved)) {
                throw new SecurityException("refusing to resolve a non-local/non-file resource: " + systemId);
            }
            try {
                DomLsInput input = new DomLsInput();
                input.setSystemId(resolved.toUri().toString());
                input.setByteStream(Files.newInputStream(resolved));
                return input;
            } catch (IOException e) {
                throw new RuntimeException("failed to open local schema resource: " + resolved, e);
            }
        }
    }

    private static final class DomLsInput implements org.w3c.dom.ls.LSInput {
        private String systemId;
        private java.io.InputStream byteStream;
        @Override public java.io.Reader getCharacterStream() { return null; }
        @Override public void setCharacterStream(java.io.Reader characterStream) { }
        @Override public java.io.InputStream getByteStream() { return byteStream; }
        @Override public void setByteStream(java.io.InputStream byteStream) { this.byteStream = byteStream; }
        @Override public String getStringData() { return null; }
        @Override public void setStringData(String stringData) { }
        @Override public String getSystemId() { return systemId; }
        @Override public void setSystemId(String systemId) { this.systemId = systemId; }
        @Override public String getPublicId() { return null; }
        @Override public void setPublicId(String publicId) { }
        @Override public String getBaseURI() { return null; }
        @Override public void setBaseURI(String baseURI) { }
        @Override public String getEncoding() { return null; }
        @Override public void setEncoding(String encoding) { }
        @Override public boolean getCertifiedText() { return false; }
        @Override public void setCertifiedText(boolean certifiedText) { }
    }

    private static final class FailFastErrorHandler implements ErrorHandler {
        private final String label;
        FailFastErrorHandler(String label) { this.label = label; }
        @Override public void warning(SAXParseException e) { System.out.println("[warn] " + label + ": " + e.getMessage()); }
        @Override public void error(SAXParseException e) throws SAXException { throw new SAXException(label + ": " + e.getMessage(), e); }
        @Override public void fatalError(SAXParseException e) throws SAXException { throw new SAXException(label + ": " + e.getMessage(), e); }
    }
}
