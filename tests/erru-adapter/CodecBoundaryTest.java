import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Wire-format boundaries: nested JSON, escaping, exact integers and optional XML data. */
public class CodecBoundaryTest {
    interface Operation { void run() throws Exception; }
    static void rejects(Operation op) throws Exception {
        try { op.run(); } catch (IllegalArgumentException | IndexOutOfBoundsException expected) { return; }
        throw new AssertionError("Invalid wire data was accepted");
    }
    public static void main(String[] args) throws Exception {
        String special = "ÕÄ😀\"\\\n\r\t\b\f\u0001";
        var dto = new LinkedHashMap<String, Object>();
        dto.put("string", special); dto.put("null", null); dto.put("boolean", false);
        dto.put("items", List.of(true, 1.25, Map.of("empty", List.of(), "object", Map.of())));
        var parsed = MiniJson.parseObject(MiniJson.write(dto));
        assert parsed.get("string").equals(special) && parsed.containsKey("null") && parsed.get("null") == null;
        assert parsed.get("boolean").equals(false);
        assert ((List<?>) parsed.get("items")).equals(dto.get("items"));
        assert MiniJson.parseObject("{\"x\":\"\\/\\b\\f\\u00d5\",\"n\":-1.2e+3}").get("x").equals("/\b\fÕ");
        for (String invalid : new String[]{"[]", "null", "true", "false", "{1:2}", "{\"x\" 2}",
                "{\"x\":2;}", "{\"x\":[1;2]}", "{\"x\":tru}", "{\"x\":fals}",
                "{\"x\":nul}", "{\"x\":\"\\q\"}", "{\"x\":\"\\uZZZZ\"}", "{\"x\":\"unterminated}", ""}) {
            rejects(() -> MiniJson.parseObject(invalid));
        }
        assert MiniJson.asIntString(null, 7).equals("7");
        assert MiniJson.asIntString(" 2.00 ", 0).equals("2");
        for (Object invalid : new Object[]{"NaN", "Infinity", "1.5", "invalid"})
            rejects(() -> MiniJson.asIntString(invalid, 0));
        assert XmlBuild.array(null).isEmpty() && XmlBuild.array(" ").isEmpty();
        assert XmlBuild.array("[]").isEmpty() && XmlBuild.array("[true,false,null]").size() == 3;
        rejects(() -> XmlBuild.array("{}")); rejects(() -> XmlBuild.array(1));
        assert XmlBuild.object("{}").isEmpty() && XmlBuild.object(Map.of()).isEmpty();
        rejects(() -> XmlBuild.object(List.of()));
        assert XmlBuild.date(null) == null && XmlBuild.date(" ") == null;
        assert XmlBuild.date("2026-11-04T12:00:00Z").equals("2026-11-04");
        rejects(() -> XmlBuild.date("not-a-date"));
        for (Object invalid : new Object[]{"yes", "", 2}) rejects(() -> XmlBuild.bool(invalid));
        assert XmlBuild.bool(true).equals("true") && XmlBuild.bool("1").equals("true");
        assert XmlBuild.bool(false).equals("false") && XmlBuild.bool("0").equals("false");
        StringBuilder attributes = new StringBuilder();
        XmlBuild.optional(attributes, "missing", null); XmlBuild.optional(attributes, "blank", " ");
        XmlBuild.optional(attributes, "text", "<quoted> & \"");
        assert attributes.toString().equals(" text=\"&lt;quoted&gt; &amp; &quot;\"");
        assert !XmlBuild.has(Map.of(), "x") && !XmlBuild.has(Map.of("x", " "), "x");
        rejects(() -> XmlBuild.required(Map.of(), "missing"));
        rejects(() -> XmlBuild.required(Map.of("x", " "), "x"));
        assert XmlUtil.escAttr(null).isEmpty() && XmlUtil.serializeElement(null).isEmpty();
        assert XmlUtil.number(null) == null && XmlUtil.number(" ") == null && XmlUtil.number(" 42 ") == 42;
        assert !XmlUtil.parseXsdBoolean(null) && !XmlUtil.parseXsdBoolean("false");
        assert XmlUtil.parseXsdBoolean(" 1 ") && XmlUtil.parseXsdBoolean(" true ");
        String controls = "a\u0000\u0008\u000b\u000c\u000e\u001fb\t\n\rc";
        assert XmlUtil.stripInvalidXmlChars(controls).equals("ab\t\n\rc");
        var root = XmlUtil.parseHardened("<r xmlns='urn:test'>text<a x='one'/><b/><a x='two'/></r>").getDocumentElement();
        assert XmlUtil.children(root, "a").size() == 2 && XmlUtil.children(null, "a").isEmpty();
        assert XmlUtil.firstChild(root, "absent") == null && XmlUtil.firstChild(null, "a") == null;
        assert XmlUtil.attrs(XmlUtil.firstChild(root, "a"), "x", "absent").equals(Map.of("x", "one"));
        assert !XmlUtil.hasAttr(null, "x") && !XmlUtil.hasAttr(root, "x");
        System.out.println("PASS JSON round trips and invalid input, integer safety, optional XML data, XSD booleans and control characters");
    }
}
