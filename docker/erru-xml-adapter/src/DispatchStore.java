import java.util.Map;

/** Mutable transport journal for outgoing XML. Business snapshots remain behind Resql. */
interface DispatchStore {
    // null grants the only dispatch claim; a saved result is replayed without sending again.
    Map<String, Object> reserve(String technicalId, String workflowId, String xml) throws Exception;
    void finish(String technicalId, String status, int httpStatus) throws Exception;

    final class Conflict extends Exception { }
}
