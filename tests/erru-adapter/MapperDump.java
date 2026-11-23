import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Prints the JSON the Java adapter hands ruuter-internal for each inbound one-way fixture
 * (fixtures/inbound/*.xml). Used once to produce fixtures/inbound/*.expected.json, the parity reference for the
 * Ruuter xtr/inbound flows (tests/erru-adapter/xtr_inbound_golden.py). Run: see the script header.
 */
public class MapperDump {
    public static void main(String[] args) throws Exception {
        List<MessageMapper> mappers = List.of(new NuAckMapper(), new NcrAckMapper(), new NcrResponseInMapper(),
                new CgrResponseMapper(), new CtudResponseMapper(), new RsiResponseMapper());
        for (String file : args) {
            byte[] raw = Files.readAllBytes(Path.of(file));
            var doc = XmlUtil.parseHardened(raw);
            String root = doc.getDocumentElement().getLocalName();
            MessageMapper m = mappers.stream().filter(x -> x.requestRoot().equals(root)).findFirst().orElseThrow();
            Map<String, Object> json = m.requestToJson(doc, Instant.now());
            Files.writeString(Path.of(file.replace(".xml", ".expected.json")), MiniJson.write(json) + "\n");
            System.out.println(root + " -> " + m.ruuterPath());
        }
    }
}
