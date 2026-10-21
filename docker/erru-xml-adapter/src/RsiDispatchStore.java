import java.sql.DriverManager;
import java.util.Map;

/** Mutable transport journal. Business snapshots remain behind Resql. */
interface RsiDispatchStore {
    // null grants the only dispatch claim; a saved result is replayed without sending again.
    Map<String, Object> reserve(String technicalId, String workflowId, String xml) throws Exception;
    void finish(String technicalId, String status, int httpStatus) throws Exception;

    final class Conflict extends Exception { }

    final class Jdbc implements RsiDispatchStore {
        private final Config config;
        Jdbc(Config config) { this.config = config; }
        @Override public Map<String, Object> reserve(String technicalId, String workflowId, String xml) throws Exception {
            try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword)) {
                try (var insert = c.prepareStatement("INSERT INTO erru.xml_rsi_dispatch(technical_id,workflow_id,xml_body) VALUES (?::uuid,?::uuid,?) ON CONFLICT DO NOTHING")) {
                    insert.setString(1, technicalId); insert.setString(2, workflowId); insert.setString(3, xml);
                    if (insert.executeUpdate() == 1) return null;
                }
                try (var query = c.prepareStatement("SELECT workflow_id::text,xml_body,status,hub_http_status FROM erru.xml_rsi_dispatch WHERE technical_id=?::uuid")) {
                    query.setString(1, technicalId);
                    try (var rs = query.executeQuery()) {
                        if (!rs.next() || !workflowId.equals(rs.getString(1)) || !xml.equals(rs.getString(2))) throw new Conflict();
                        return Map.of("status", rs.getString(3), "httpStatus", rs.getInt(4),
                                "technicalId", technicalId, "workflowId", workflowId);
                    }
                }
            }
        }
        @Override public void finish(String technicalId, String status, int httpStatus) throws Exception {
            try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword);
                 var update = c.prepareStatement("UPDATE erru.xml_rsi_dispatch SET status=?,hub_http_status=?,completed_at=clock_timestamp() WHERE technical_id=?::uuid")) {
                update.setString(1, status); update.setInt(2, httpStatus); update.setString(3, technicalId);
                if (update.executeUpdate() != 1) throw new IllegalStateException("Dispatch journal record missing");
            }
        }
    }
}
