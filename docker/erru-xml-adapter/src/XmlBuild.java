import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/** Shared helpers for the outgoing request builders. Missing business data is never invented. */
final class XmlBuild {
    static final String NS = "https://webgate.ec.testa.eu/move-hub/erru/3.5";
    private static final Pattern DATE = Pattern.compile("^(\\d{4}-\\d{2}-\\d{2})(?:[T ].*)?$");

    private XmlBuild() { }

    /** Opens the root element and writes the Header. {@code to} is the Hub routing target. */
    static StringBuilder open(String root, Map<String, Object> dto, String from, String to) {
        UUID.fromString(required(dto, "technicalId"));
        UUID.fromString(required(dto, "workflowId"));
        StringBuilder x = new StringBuilder("<").append(root).append(" xmlns=\"").append(NS).append("\"><Header");
        attr(x, "version", "3.5");
        attr(x, "technicalId", required(dto, "technicalId"));
        attr(x, "workflowId", required(dto, "workflowId"));
        attr(x, "sentAt", utc(required(dto, "sentAt")));
        attr(x, "from", from);
        attr(x, "to", to);
        return x.append("/>");
    }

    static void body(StringBuilder x, Map<String, Object> dto) {
        x.append("<Body");
        for (String key : new String[]{"businessCaseId", "originatingAuthority", "requestSource", "requestPurpose"})
            attr(x, key, required(dto, key));
        x.append('>');
    }

    static String utc(String value) {
        return OffsetDateTime.parse(value.replace(' ', 'T')).withOffsetSameInstant(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss'Z'"));
    }

    /** DATE columns may arrive with a time part; ERRU globalDateType is a plain date. */
    static String date(Object value) {
        String s = MiniJson.asString(value);
        if (s == null || s.isBlank()) return null;
        var m = DATE.matcher(s.trim());
        if (!m.matches()) throw new IllegalArgumentException("Invalid date");
        return m.group(1);
    }

    static boolean has(Map<String, Object> map, String key) {
        String s = MiniJson.asString(map.get(key));
        return s != null && !s.isBlank();
    }

    static String required(Map<String, Object> map, String key) {
        String s = MiniJson.asString(map.get(key));
        if (s == null || s.isBlank()) throw new IllegalArgumentException("Missing " + key);
        return s;
    }

    static void attr(StringBuilder x, String key, String value) {
        x.append(' ').append(key).append("=\"").append(XmlUtil.escAttr(value)).append('"');
    }

    static void optional(StringBuilder x, String key, Object value) {
        if (value != null && !value.toString().isBlank()) attr(x, key, value.toString());
    }
}
