import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

/**
 * DOM helpers used AFTER a document has already passed {@link SchemaRegistry#validate}. Still
 * hardened independently (no DOCTYPE, no external entities) — defence in depth, not reliance on
 * validation having run first.
 */
final class XmlUtil {
    private XmlUtil() { }

    /** Self-parsing our own generated XML — no encoding ambiguity, it's already a Java String. */
    static Document parseHardened(String xml) throws Exception {
        return parseHardened(new InputSource(new StringReader(xml)));
    }

    /**
     * Parsing wire input: raw bytes, not a pre-decoded String, so the parser honours a BOM /
     * `encoding="..."` declaration itself.
     */
    static Document parseHardened(byte[] xml) throws Exception {
        return parseHardened(new InputSource(new java.io.ByteArrayInputStream(xml)));
    }

    private static Document parseHardened(InputSource source) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        factory.setNamespaceAware(true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(source);
    }

    /** First direct child element with the given local name, or null. */
    static Element firstChild(Element parent, String localName) {
        if (parent == null) return null;
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node n = children.item(i);
            if (n.getNodeType() == Node.ELEMENT_NODE && localName.equals(n.getLocalName())) {
                return (Element) n;
            }
        }
        return null;
    }

    /** attribute value, or "" if the element is null or the attribute is absent (never null). */
    static String attr(Element el, String name) {
        if (el == null || !el.hasAttribute(name)) return "";
        return el.getAttribute(name);
    }

    /** true if the element has the given attribute at all (distinguishes absent from ""). */
    static boolean hasAttr(Element el, String name) {
        return el != null && el.hasAttribute(name);
    }

    /**
     * xs:boolean's lexical space is "true"/"false"/"1"/"0" (XML Schema Part 2 §3.2.2), with
     * whitespace collapse applied first (leading/trailing whitespace and internal runs of
     * whitespace normalised) — unlike {@link Boolean#parseBoolean}, which silently treats "1" as
     * false and does not collapse whitespace at all. A mapper reading an xs:boolean-typed XSD
     * attribute must use this, not Boolean.parseBoolean, or a genuinely `1`/`" true "` value from
     * the wire is misread as `false` (confirmed live: `appealPossible="
     * true "` passes XSD validation but was read as false before this fix).
     */
    static boolean parseXsdBoolean(String s) {
        if (s == null) return false;
        String collapsed = s.trim().replaceAll("\\s+", " ");
        return "true".equals(collapsed) || "1".equals(collapsed);
    }

    /**
     * Serializes an already-validated element (and its full subtree) back to an XML string,
     * exactly as parsed — used to echo a request fragment (e.g. CGR's SearchedTransportManager,
     * CTUD's SearchedCompany) verbatim in an answer, instead of a mapper manually re-listing each
     * attribute/child it happens to know about and silently dropping anything else the XSD
     * allows (a real, confirmed bug — CGR's TransportManagerAddressDetails child was dropped
     * this way). The element keeps its own namespace declaration when serialized standalone; this
     * is redundant but harmless when the fragment is then embedded in a same-namespace document,
     * and still validates correctly.
     */
    static String serializeElement(Element el) {
        if (el == null) return "";
        try {
            javax.xml.transform.Transformer transformer =
                    javax.xml.transform.TransformerFactory.newInstance().newTransformer();
            transformer.setOutputProperty(javax.xml.transform.OutputKeys.OMIT_XML_DECLARATION, "yes");
            java.io.StringWriter sw = new java.io.StringWriter();
            transformer.transform(new javax.xml.transform.dom.DOMSource(el), new javax.xml.transform.stream.StreamResult(sw));
            return sw.toString();
        } catch (Exception e) {
            throw new RuntimeException("failed to serialize element " + el.getLocalName(), e);
        }
    }

    /** All direct child elements with the given local name, in document order (never null). */
    static List<Element> children(Element parent, String localName) {
        List<Element> out = new ArrayList<>();
        if (parent == null) return out;
        NodeList kids = parent.getChildNodes();
        for (int i = 0; i < kids.getLength(); i++) {
            Node n = kids.item(i);
            if (n.getNodeType() == Node.ELEMENT_NODE && localName.equals(n.getLocalName())) {
                out.add((Element) n);
            }
        }
        return out;
    }

    /** Escapes an XML attribute value, stripping XML-1.0-forbidden control characters first. */
    static String escAttr(String s) {
        if (s == null) return "";
        return stripInvalidXmlChars(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /**
     * XML 1.0 forbids C0 control characters other than tab/LF/CR (U+0000-U+0008, U+000B, U+000C,
     * U+000E-U+001F) anywhere in character data, even escaped. A value sourced from a DB column
     * could contain one; stripping here keeps a hand-built attribute value well-formed. Defence in
     * depth — every generated message is still XSD-validated before it is queued.
     */
    static String stripInvalidXmlChars(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            boolean forbidden = (c <= 0x08) || c == 0x0B || c == 0x0C || (c >= 0x0E && c <= 0x1F);
            if (!forbidden) {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
