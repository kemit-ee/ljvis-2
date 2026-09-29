import java.util.Set;

/**
 * Maps a Ruuter flow's raw status token onto the XSD enum each response type actually allows —
 * and only that. `Timeout`/`NotAvailable` are NOT in this allowed set for any type, even though
 * they are valid XSD enum values: ERRU XML Message Reference 2.06 §6.2 p.26 and §6.4 p.29
 * reserve both values for the **Hub** to set, never a member state's own answer (confirmed by
 * every response type's statusCode enum itself: `globalAcknowledgementStatusCodeType`,
 * `ncrAcknowledgementStatusCodeType`, `rsiResponseStatusCodeType` and
 * `globalSearchResponseStatusCodeType` all only ever contain `OK`/`Found`/`NotFound` as the
 * genuine non-Hub-reserved values). A flow answer outside the allowed set — a business rejection
 * (`InvalidData`), a technical failure the flow surfaced as a status string, or anything
 * unrecognised — throws {@link InvalidStatusException} instead of being silently downgraded to
 * `NotAvailable`: the caller (`ProcessingWorker`) must send an ErrorNotification instead, which is
 * what the protocol actually requires for "we cannot give you a real answer".
 */
final class StatusMapper {
    private StatusMapper() { }

    enum Kind {
        /** CheckGoodRepute / CheckTransportUndertakingData: Found/NotFound only. */
        SEARCH(Set.of("Found", "NotFound")),
        /** RoadSideInspection_Response: OK/NotFound only. */
        RSI(Set.of("OK", "NotFound")),
        /** NotifyCheckResult_Acknowledgement / NotifyUnfitness_Acknowledgement: OK only. */
        ACK(Set.of("OK"));

        final Set<String> allowed;
        Kind(Set<String> allowed) { this.allowed = allowed; }
    }

    record Mapped(String statusCode, String statusMessage) { }

    /** Thrown by {@link #map} for any status outside the type's allowed (non-Hub-reserved) set. */
    static final class InvalidStatusException extends RuntimeException {
        final String rawStatus;
        final String rawMessage;
        InvalidStatusException(String rawStatus, String rawMessage) {
            super("status '" + rawStatus + "' is not a valid member-state answer for this type"
                    + (rawMessage == null || rawMessage.isBlank() ? "" : " (" + rawMessage + ")"));
            this.rawStatus = rawStatus;
            this.rawMessage = rawMessage;
        }
    }

    static Mapped map(Kind kind, String rawStatus, String rawMessage) {
        if (rawStatus != null && kind.allowed.contains(rawStatus)) {
            return new Mapped(rawStatus, rawMessage);
        }
        throw new InvalidStatusException(rawStatus, rawMessage);
    }
}
