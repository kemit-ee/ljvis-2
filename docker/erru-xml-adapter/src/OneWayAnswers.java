import java.util.Map;

/** The Ruuter answers that mean a one-way inbound message (acknowledgement or response) was handled. */
final class OneWayAnswers {
    private OneWayAnswers() { }

    static boolean isAnswer(Map<String, Object> json) {
        Object status = json.get("status");
        return "responded".equals(status) || "already_responded".equals(status)
                || "acknowledged".equals(status) || "already_acknowledged".equals(status) || "ignored".equals(status);
    }
}
