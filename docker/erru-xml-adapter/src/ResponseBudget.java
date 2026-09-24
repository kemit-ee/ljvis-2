import java.time.Duration;
import java.time.Instant;

final class ResponseBudget {
    static final Duration DEFAULT_WINDOW = Duration.ofSeconds(10);
    static final Duration DELIVERY_MARGIN = Duration.ofSeconds(2);
    private static final Duration MINIMUM_RETRY_CALL = Duration.ofSeconds(1);

    private ResponseBudget() { }

    static Instant deadline(Instant supplied, Instant receivedAt) {
        return supplied != null ? supplied : receivedAt.plus(DEFAULT_WINDOW);
    }

    static Duration callTimeout(Instant deadline, Instant now, Duration maximum) {
        return bounded(Duration.between(now, deadline).minus(DELIVERY_MARGIN), maximum);
    }

    static Duration deliveryTimeout(Instant deadline, Instant now) {
        return bounded(Duration.between(now, deadline), Duration.ofSeconds(20));
    }

    static boolean canRetry(Instant deadline, Instant now, long delayMs) {
        return now.plusMillis(delayMs).plus(DELIVERY_MARGIN).plus(MINIMUM_RETRY_CALL).isBefore(deadline);
    }

    private static Duration bounded(Duration remaining, Duration maximum) {
        if (remaining.isNegative() || remaining.isZero()) return Duration.ZERO;
        return remaining.compareTo(maximum) < 0 ? remaining : maximum;
    }
}
