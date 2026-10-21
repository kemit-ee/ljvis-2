import org.w3c.dom.Document;

import java.time.Instant;
import java.util.Map;

/**
 * One implementation per ERRU request type, registered by {@link #requestRoot()} in
 * {@link ProcessingWorker}'s mapper registry so the processing loop itself is generic across all
 * 5 types instead of NU-only.
 */
interface MessageMapper {
    /** Root element local name of the inbound request this mapper handles, e.g. "NotifyUnfitness_Request". */
    String requestRoot();

    /** Root element local name of the outbound answer, for XSD self-validation before sending. */
    String responseRoot();

    /** Path on ruuter-internal that serves this request type, e.g. "/ljvis/erru/nu/inbound-request". */
    String ruuterPath();

    /** Per-type Ruuter call timeout (NU/NCR/RSI 20s, CGR/CTUD 45s — MTR waits up to 35s). */
    java.time.Duration ruuterTimeout();

    /** Notifications must finish their business effects even after the response deadline. */
    default boolean requiresBusinessCompletion() { return false; }

    /** Builds the JSON body for the Ruuter call from a validated request DOM. */
    Map<String, Object> requestToJson(Document requestDoc, Instant receivedAt);

    /**
     * Whether a Ruuter response body is a real business answer for this type (as opposed to a
     * generic/unrelated error envelope) — checked BEFORE looking at the HTTP status, since a
     * legitimate business rejection (InvalidData) can arrive on a 4xx.
     */
    boolean isAnswer(Map<String, Object> json);

    /**
     * Builds the outbound answer XML from a Ruuter answer (requestDoc is the source for
     * correlation/echo fields). Throws (typically {@link StatusMapper.InvalidStatusException})
     * if the answer's status is not a genuine member-state value for this type — the caller must
     * send an ErrorNotification instead ({@link ErrorNotificationBuilder}), never a synthetic
     * business answer.
     */
    String buildResponseXml(Map<String, Object> json, Document requestDoc, String freshTechnicalId);
}
