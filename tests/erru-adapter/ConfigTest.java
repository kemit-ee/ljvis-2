import java.lang.management.ManagementFactory;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

/** Startup validation uses isolated child environments; no deployment credentials are read. */
public class ConfigTest {
    static Map<String, String> validEnvironment() {
        return new LinkedHashMap<>(Map.ofEntries(
                Map.entry("DB_URL", "jdbc:postgresql://127.0.0.1:1/test"),
                Map.entry("DB_USER", "test"), Map.entry("DB_PASSWORD", "synthetic"),
                Map.entry("RUUTER_INTERNAL_BASE_URL", "http://127.0.0.1:1"),
                Map.entry("INTERNAL_COMMUNICATION_KEY", "synthetic-token"),
                Map.entry("HUB_RESPONSE_URL", "https://example.invalid/response"),
                Map.entry("CONTRACTS_DIR", "contracts/erru/3.5"),
                Map.entry("RESPONDING_AUTHORITY", "EE-PPA"),
                Map.entry("RESPONDING_AUTHORITY_CTUD", "EE-TRAM"),
                Map.entry("RESPONDING_AUTHORITY_RSI", "EE-TRAM"),
                Map.entry("RESPONDING_AUTHORITY_NCR", "EE-TRAM"),
                Map.entry("MEMBER_STATE_CODE", "EE")));
    }

    static void run(Map<String, String> environment, String... expected) throws Exception {
        var command = new ArrayList<String>();
        command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
        // Preserve optional instrumentation when this suite runs under JaCoCo.
        ManagementFactory.getRuntimeMXBean().getInputArguments().stream()
                .filter(arg -> arg.startsWith("-javaagent:")).forEach(command::add);
        command.add("-ea");
        command.add("-classpath");
        command.add(System.getProperty("java.class.path"));
        command.add(Probe.class.getName());
        var builder = new ProcessBuilder(command).redirectErrorStream(true);
        builder.environment().clear();
        builder.environment().putAll(environment);
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        if (process.waitFor() != 0) throw new AssertionError(output);
        for (String message : expected) {
            if (!output.contains(message)) throw new AssertionError("Missing result: " + message + "; " + output);
        }
    }

    public static void main(String[] args) throws Exception {
        run(validEnvironment(), "DEFAULTS_OK");
        var custom = validEnvironment();
        custom.putAll(Map.of("PORT", " 9090 ", "POLL_INTERVAL_MS", "25", "LEASE_MS", "200000",
                "PROCESSING_MAX_ATTEMPTS", "2", "DELIVERY_MAX_ATTEMPTS", "3", "WORKER_ID", "test-worker"));
        custom.put("DB_USER", " test ");
        for (String type : new String[]{"RSI", "CGR", "CTUD", "NCR", "NU"}) {
            custom.put("HUB_" + type + "_REQUEST_URL", "https://example.invalid/" + type);
        }
        run(custom, "CUSTOM_OK");
        var missing = validEnvironment();
        missing.remove("DB_PASSWORD");
        missing.put("INTERNAL_COMMUNICATION_KEY", "  ");
        run(missing, "DB_PASSWORD is not set", "INTERNAL_COMMUNICATION_KEY is not set");
        for (String value : new String[]{"ftp://example.invalid", "https://user:password@example.invalid", "https:///path", "http://["}) {
            var invalid = validEnvironment();
            invalid.put("HUB_RESPONSE_URL", value);
            invalid.put("HUB_RSI_REQUEST_URL", value);
            run(invalid, "invalid configuration", "HUB_RESPONSE_URL", "HUB_RSI_REQUEST_URL");
        }
        var numbers = validEnvironment();
        numbers.putAll(Map.of("PORT", "0", "POLL_INTERVAL_MS", "-1", "LEASE_MS", "NaN",
                "PROCESSING_MAX_ATTEMPTS", "invalid", "DELIVERY_MAX_ATTEMPTS", "0"));
        run(numbers, "PORT must be a positive number", "POLL_INTERVAL_MS must be a positive number",
                "LEASE_MS must be a number", "PROCESSING_MAX_ATTEMPTS must be a number",
                "DELIVERY_MAX_ATTEMPTS must be a positive number");
        var blank = validEnvironment();
        blank.putAll(Map.of("PORT", " ", "WORKER_ID", " ", "HUB_RSI_REQUEST_URL", " "));
        run(blank, "DEFAULTS_OK");
        System.out.println("PASS configuration defaults, overrides, missing credentials, invalid Hub URLs and retry limits");
    }

    public static class Probe {
        public static void main(String[] args) {
            try {
                Config c = Config.load();
                assert "test".equals(c.dbUser);
                if (c.port == 8080) {
                    assert c.pollIntervalMs == 1000 && c.leaseMs == 150000;
                    assert c.processingMaxAttempts == 4 && c.deliveryMaxAttempts == 8;
                    assert c.workerId.startsWith("erru-xml-adapter-");
                    assert c.rsiRequestUrl == null && c.cgrRequestUrl == null && c.ctudRequestUrl == null;
                    assert c.ncrRequestUrl == null && c.nuRequestUrl == null;
                    System.out.println("DEFAULTS_OK");
                } else {
                    assert c.port == 9090 && c.pollIntervalMs == 25 && c.leaseMs == 200000;
                    assert c.processingMaxAttempts == 2 && c.deliveryMaxAttempts == 3;
                    assert c.workerId.equals("test-worker");
                    assert c.rsiRequestUrl.getPath().equals("/RSI") && c.cgrRequestUrl.getPath().equals("/CGR");
                    assert c.ctudRequestUrl.getPath().equals("/CTUD") && c.ncrRequestUrl.getPath().equals("/NCR");
                    assert c.nuRequestUrl.getPath().equals("/NU");
                    System.out.println("CUSTOM_OK");
                }
            } catch (IllegalStateException expected) {
                System.out.println(expected.getMessage());
            }
        }
    }
}
