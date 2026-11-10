import java.net.URI;
import java.time.Duration;

/** Internal, synchronous RSI dispatch. See {@link OutboundXmlHandler}. */
final class RsiSendHandler extends OutboundXmlHandler {
    static final Kind KIND = new Kind("/internal/rsi", "RoadSideInspection_Request", RsiRequestXml::build,
            "invalid_rsi_xml", "RSI data does not satisfy the ERRU 3.5 contract", "rsi_endpoint_not_configured", Kind.ACCEPTED_202);

    RsiSendHandler(SchemaRegistry schemas, String token, String memberState, URI endpoint, Duration timeout, RsiDispatchStore store) {
        super(KIND, schemas, token, memberState, endpoint, timeout, store);
    }
}
