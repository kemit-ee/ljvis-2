import java.sql.DriverManager;
import java.util.Map;

/** Transport journal of outgoing CGR and CTUD. A CGR resend has its own technicalId and shares the workflowId. */
final class OutboundDispatchStore implements DispatchStore {
    private final Config config;
    private final String messageType;

    OutboundDispatchStore(Config config, String messageType) {
        this.config = config;
        this.messageType = messageType;
    }

    @Override public Map<String, Object> reserve(String technicalId, String workflowId, String xml) throws Exception {
        try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword)) {
            try (var insert = c.prepareStatement("INSERT INTO erru.xml_outbound_dispatch(technical_id,workflow_id,message_type,xml_body) VALUES (?::uuid,?::uuid,?,?) ON CONFLICT DO NOTHING")) {
                insert.setString(1, technicalId); insert.setString(2, workflowId);
                insert.setString(3, messageType); insert.setString(4, xml);
                if (insert.executeUpdate() == 1) return null;
            }
            try (var query = c.prepareStatement("SELECT workflow_id::text,message_type,xml_body,status,hub_http_status FROM erru.xml_outbound_dispatch WHERE technical_id=?::uuid")) {
                query.setString(1, technicalId);
                try (var rs = query.executeQuery()) {
                    if (!rs.next() || !workflowId.equals(rs.getString(1)) || !messageType.equals(rs.getString(2))
                            || !xml.equals(rs.getString(3))) throw new Conflict();
                    return Map.of("status", rs.getString(4), "httpStatus", rs.getInt(5),
                            "technicalId", technicalId, "workflowId", workflowId);
                }
            }
        }
    }

    @Override public void finish(String technicalId, String status, int httpStatus) throws Exception {
        try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword);
             var update = c.prepareStatement("UPDATE erru.xml_outbound_dispatch SET status=?,hub_http_status=?,completed_at=clock_timestamp() WHERE technical_id=?::uuid AND message_type=?")) {
            update.setString(1, status); update.setInt(2, httpStatus); update.setString(3, technicalId);
            update.setString(4, messageType);
            if (update.executeUpdate() != 1) throw new IllegalStateException("Dispatch journal record missing");
        }
    }
}
