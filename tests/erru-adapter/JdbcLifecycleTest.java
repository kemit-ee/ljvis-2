import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.UUID;

/** Transport journals and lease fencing against a disposable PostgreSQL database. */
public class JdbcLifecycleTest {
    static Config config;
    static Db db;
    static String id() { return UUID.randomUUID().toString(); }
    static void sql(String text) throws Exception {
        try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword);
             var s = c.createStatement()) { s.execute(text); }
    }
    static String value(String text) throws Exception {
        try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword);
             var s = c.createStatement(); var r = s.executeQuery(text)) { r.next(); return r.getString(1); }
    }
    static Db.InboxRow insert(String tid, String workflow, Instant deadline) throws Exception {
        return db.insertOrGetExisting("TEST", "EE", tid, workflow, "synthetic-case", "<test/>", "digest", deadline);
    }
    static void lost(Db other, Db.ClaimedInbox row) throws Exception {
        try {
            other.storeOutcome(row, "<answer/>", id(), Instant.now().plusSeconds(60), true, false, null, 0);
            throw new AssertionError("A stale worker persisted an outcome");
        } catch (Db.LeaseLostException expected) { }
    }
    static void missingDispatch(DispatchStore store) throws Exception {
        try { store.finish(id(), "accepted", 202); throw new AssertionError("Missing dispatch was updated"); }
        catch (IllegalStateException expected) { }
    }
    public static void main(String[] args) throws Exception {
        if (!"1".equals(System.getenv("ERRU_DISPOSABLE_DATABASE")))
            throw new IllegalStateException("Use run-integration-tests.sh with its disposable database");
        config = Config.load(); db = new Db(config);
        sql(Files.readString(Path.of("DSL/Liquibase/changelog/20261201090000-initial-erru-xml-inbox-outbox.sql")));
        sql("CREATE SCHEMA xroad; CREATE TABLE xroad.xroad_integration_log(service_code text,request_xml text,response_xml text,duration_ms bigint,success boolean,error_message text,source_type text,source_record_id text,result_status text)");
        sql("CREATE TABLE erru.xml_rsi_dispatch(technical_id uuid PRIMARY KEY, workflow_id uuid NOT NULL, xml_body text NOT NULL,status text NOT NULL DEFAULT 'unknown',hub_http_status integer,completed_at timestamptz)");
        sql("CREATE TABLE erru.xml_outbound_dispatch(technical_id uuid PRIMARY KEY, workflow_id uuid NOT NULL,message_type text NOT NULL,xml_body text NOT NULL,status text NOT NULL DEFAULT 'unknown',hub_http_status integer,completed_at timestamptz)");
        assert db.claimNextInbox(new String[]{"TEST"}).isEmpty();
        assert db.claimNextOutbox().isEmpty();
        String tid = id();
        var initial = insert(tid, null, null);
        assert insert(tid, "", null).id() == initial.id();
        assert db.insertOrGetExisting("TEST", "EE", tid, null, "synthetic-case", "changed", "changed", null).payloadDigest().equals("digest");
        db.recordConflictAttempt(initial.id(), "changed");
        assert value("SELECT last_error FROM erru.xml_inbox WHERE id=" + initial.id()).contains("conflicting redelivery");
        var owner = db.claimNextInbox(new String[]{"TEST"}).orElseThrow();
        assert owner.id() == initial.id() && owner.workflowId() == null && owner.deadlineAt() == null;
        assert new Db(config).claimNextInbox(new String[]{"TEST"}).isEmpty();
        Db replacement = new Db(config);
        lost(replacement, owner);
        db.markInboxFailed(owner.id(), replacement.workerId, "stale");
        db.retryInboxLater(owner.id(), replacement.workerId, "stale", 0);
        assert value("SELECT status FROM erru.xml_inbox WHERE id=" + owner.id()).equals("processing");
        db.retryInboxLater(owner.id(), db.workerId, "x".repeat(4100), 60000);
        assert db.claimNextInbox(new String[]{"TEST"}).isEmpty();
        sql("UPDATE erru.xml_inbox SET next_attempt_at=now()-interval '1 second' WHERE id=" + owner.id());
        owner = db.claimNextInbox(new String[]{"TEST"}).orElseThrow();
        db.markInboxFailed(owner.id(), db.workerId, "failed");
        assert insert(tid, null, null).status().equals("received");
        owner = db.claimNextInbox(new String[]{"TEST"}).orElseThrow();
        sql("UPDATE erru.xml_inbox SET lease_expires_at=now()-interval '1 second' WHERE id=" + owner.id());
        var reclaimed = replacement.claimNextInbox(new String[]{"TEST"}).orElseThrow();
        lost(db, owner);
        try {
            replacement.storeOutcome(reclaimed, "<answer/>", id(), Instant.now().plusSeconds(60), true, false, null, 0);
            throw new AssertionError("An outcome without a required workflow ID was stored");
        } catch (java.sql.SQLException expected) {
            assert "23502".equals(expected.getSQLState()) : expected;
        }
        assert value("SELECT status FROM erru.xml_inbox WHERE id=" + owner.id()).equals("processing");
        assert value("SELECT count(*) FROM erru.xml_outbox").equals("0");
        sql("UPDATE erru.xml_inbox SET workflow_id='" + id() + "' WHERE id=" + owner.id());
        replacement.storeOutcome(reclaimed, "<answer/>", id(), Instant.now().plusSeconds(60), true, false, null, 0);
        assert value("SELECT status FROM erru.xml_inbox WHERE id=" + owner.id()).equals("processed");
        lost(replacement, reclaimed);
        var outgoing = replacement.claimNextOutbox().orElseThrow();
        assert outgoing.xmlBody().equals("<answer/>");
        db.markOutboxDelivered(outgoing.id(), db.workerId);
        db.markOutboxExpired(outgoing.id(), db.workerId);
        db.markOutboxFailed(outgoing.id(), db.workerId, "stale", 3, 0, false);
        assert value("SELECT status FROM erru.xml_outbox WHERE id=" + outgoing.id()).equals("sending");
        replacement.markOutboxFailed(outgoing.id(), replacement.workerId, "retry", 3, 0, false);
        outgoing = replacement.claimNextOutbox().orElseThrow();
        replacement.markOutboxDelivered(outgoing.id(), replacement.workerId);
        assert value("SELECT status FROM erru.xml_outbox WHERE id=" + outgoing.id()).equals("delivered");
        for (boolean retry : new boolean[]{true, false}) {
            insert(id(), id(), Instant.now().plusSeconds(60));
            var next = db.claimNextInbox(new String[]{"TEST"}).orElseThrow();
            db.storeOutcome(next, "<answer/>", id(), Instant.now().plusSeconds(60), false, retry, "business incomplete", 60000);
            assert value("SELECT status FROM erru.xml_inbox WHERE id=" + next.id()).equals(retry ? "received" : "failed");
            var out = db.claimNextOutbox().orElseThrow();
            if (retry) db.markOutboxExpired(out.id(), db.workerId);
            else db.markOutboxFailed(out.id(), db.workerId, "permanent", 8, 0, true);
            assert value("SELECT status FROM erru.xml_outbox WHERE id=" + out.id()).equals(retry ? "expired" : "failed");
        }
        insert(id(), id(), Instant.now().plusSeconds(60));
        var oneWay = db.claimNextInbox(new String[]{"TEST"}).orElseThrow();
        try { db.completeOneWayInbox(oneWay.id(), replacement.workerId); throw new AssertionError("Stale completion"); }
        catch (java.sql.SQLException expected) { }
        db.completeOneWayInbox(oneWay.id(), db.workerId);
        assert value("SELECT status FROM erru.xml_inbox WHERE id=" + oneWay.id()).equals("processed");
        for (DispatchStore store : new DispatchStore[]{new RsiDispatchStore.Jdbc(config), new OutboundDispatchStore(config, "CGR")}) {
            String technical = id(), workflow = id();
            assert store.reserve(technical, workflow, "<request/>") == null;
            assert store.reserve(technical, workflow, "<request/>").get("status").equals("unknown");
            store.finish(technical, "accepted", 202);
            assert store.reserve(technical, workflow, "<request/>").get("httpStatus").equals(202);
            for (String[] conflict : new String[][]{{id(), "<request/>"}, {workflow, "changed"}}) {
                try { store.reserve(technical, conflict[0], conflict[1]); throw new AssertionError("Conflicting replay accepted"); }
                catch (DispatchStore.Conflict expected) { }
            }
            missingDispatch(store);
        }
        db.logInboxFailure(initial.id(), null); db.logInboxFailure(initial.id(), " ");
        assert Integer.parseInt(value("SELECT count(*) FROM xroad.xroad_integration_log")) > 0;
        System.out.println("PASS JDBC replay, conflict, retry, revival, lease fencing, atomic outcome, delivery and dispatch journals");
    }
}
