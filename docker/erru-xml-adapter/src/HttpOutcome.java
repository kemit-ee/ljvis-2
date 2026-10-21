/**
 * Shared HTTP status classification for ProcessingWorker (calling Ruuter.internal) and
 * DeliveryWorker (calling the Hub), so both workers treat the same statuses the same way.
 */
final class HttpOutcome {
    private HttpOutcome() { }

    /** 5xx (server-side failure), 408 (request timeout) and 429 (rate-limited) are worth retrying. */
    static boolean isTransient(int status) {
        return status >= 500 || status == 408 || status == 429;
    }
}
