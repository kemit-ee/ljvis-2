import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal, dependency-free JSON reader/writer. Deliberately not a library (matches the
 * project's docker/nysiis and docker/xtr-mock convention of "the JDK's only dependency is
 * itself"): the Ruuter.internal JSON contract this adapter talks to is small and well-known
 * (see DSL/Ruuter.internal/ljvis/POST/erru/nu/inbound-request.yml), and a real JSON library
 * would be the first non-JDBC dependency in this image for no real benefit.
 *
 * Supports objects, arrays, strings (with escapes), numbers, booleans and null — enough to
 * round-trip everything Ruuter.internal/Resql send and expect here.
 */
final class MiniJson {
    private MiniJson() { }

    @SuppressWarnings("unchecked")
    static Map<String, Object> parseObject(String json) {
        Object v = new Parser(json).parseValue();
        if (!(v instanceof Map)) {
            throw new IllegalArgumentException("expected a JSON object, got: " + json);
        }
        return (Map<String, Object>) v;
    }

    static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    /**
     * Renders a JSON number as an xs:integer/xs:nonNegativeInteger-safe string. Every number this
     * parser reads is a {@link Double} (see {@link Parser#parseNum}) — a real, live bug: a mapper
     * that did `String.valueOf(json.get("numberOfVehicles"))` for a `0` sent over the wire got the
     * literal string `"0.0"`, which XSD integer types reject outright
     * (`cvc-datatype-valid.1.2.1`). A Java-native `int`/`Integer` value built directly in a test
     * fixture never showed this, since only real JSON parsing goes through {@link Parser#parseNum}
     * — this must be used for every XSD integer-typed field a mapper reads from a Ruuter answer.
     */
    static String asIntString(Object v, long fallback) {
        if (v == null) return String.valueOf(fallback);
        try {
            return new java.math.BigDecimal(String.valueOf(v).trim()).toBigIntegerExact().toString();
        } catch (NumberFormatException | ArithmeticException e) {
            throw new IllegalArgumentException("Expected an exact integer, got " + v, e);
        }
    }

    static String write(Map<String, Object> obj) {
        return write((Object) obj);
    }

    /** Also writes a top-level List (an array), not just an object. */
    static String write(List<Object> arr) {
        return write((Object) arr);
    }

    private static String write(Object v) {
        StringBuilder sb = new StringBuilder();
        writeValue(v, sb);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void writeValue(Object v, StringBuilder sb) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String s) {
            writeString(s, sb);
        } else if (v instanceof Map<?, ?> m) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                writeString(String.valueOf(e.getKey()), sb);
                sb.append(':');
                writeValue(e.getValue(), sb);
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            boolean first = true;
            for (Object item : l) {
                if (!first) sb.append(',');
                first = false;
                writeValue(item, sb);
            }
            sb.append(']');
        } else if (v instanceof Boolean || v instanceof Number) {
            sb.append(v);
        } else {
            writeString(String.valueOf(v), sb);
        }
    }

    private static void writeString(String s, StringBuilder sb) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }

    private static final class Parser {
        private final String s;
        private int i;
        Parser(String s) { this.s = s; this.i = 0; }

        Object parseValue() {
            skipWs();
            char c = s.charAt(i);
            return switch (c) {
                case '{' -> parseObj();
                case '[' -> parseArr();
                case '"' -> parseStr();
                case 't' -> { expect("true"); yield Boolean.TRUE; }
                case 'f' -> { expect("false"); yield Boolean.FALSE; }
                case 'n' -> { expect("null"); yield null; }
                default -> parseNum();
            };
        }

        private Map<String, Object> parseObj() {
            Map<String, Object> map = new LinkedHashMap<>();
            i++; // {
            skipWs();
            if (peek() == '}') { i++; return map; }
            while (true) {
                skipWs();
                String key = parseStr();
                skipWs();
                if (s.charAt(i) != ':') throw err("expected ':'");
                i++;
                Object val = parseValue();
                map.put(key, val);
                skipWs();
                char c = s.charAt(i);
                if (c == ',') { i++; continue; }
                if (c == '}') { i++; break; }
                throw err("expected ',' or '}'");
            }
            return map;
        }

        private List<Object> parseArr() {
            List<Object> list = new ArrayList<>();
            i++; // [
            skipWs();
            if (peek() == ']') { i++; return list; }
            while (true) {
                list.add(parseValue());
                skipWs();
                char c = s.charAt(i);
                if (c == ',') { i++; continue; }
                if (c == ']') { i++; break; }
                throw err("expected ',' or ']'");
            }
            return list;
        }

        private String parseStr() {
            if (s.charAt(i) != '"') throw err("expected string");
            i++;
            StringBuilder sb = new StringBuilder();
            while (true) {
                char c = s.charAt(i++);
                if (c == '"') break;
                if (c == '\\') {
                    char e = s.charAt(i++);
                    switch (e) {
                        case '"' -> sb.append('"');
                        case '\\' -> sb.append('\\');
                        case '/' -> sb.append('/');
                        case 'n' -> sb.append('\n');
                        case 'r' -> sb.append('\r');
                        case 't' -> sb.append('\t');
                        case 'b' -> sb.append('\b');
                        case 'f' -> sb.append('\f');
                        case 'u' -> {
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                            i += 4;
                        }
                        default -> throw err("bad escape \\" + e);
                    }
                } else {
                    sb.append(c);
                }
            }
            return sb.toString();
        }

        private Double parseNum() {
            int start = i;
            while (i < s.length() && "-+.eE0123456789".indexOf(s.charAt(i)) >= 0) i++;
            return Double.parseDouble(s.substring(start, i));
        }

        private void expect(String lit) {
            if (!s.regionMatches(i, lit, 0, lit.length())) throw err("expected '" + lit + "'");
            i += lit.length();
        }

        private char peek() { return s.charAt(i); }
        private void skipWs() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
        private IllegalArgumentException err(String msg) {
            return new IllegalArgumentException(msg + " at offset " + i + " in: " + s);
        }
    }
}
