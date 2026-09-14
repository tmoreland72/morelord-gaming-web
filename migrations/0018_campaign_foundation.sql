-- GM-only foundation. Apply via migrations; approval triggers are part of the contract.
CREATE TABLE campaigns (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX campaigns_owner_idx ON campaigns(owner_id);
CREATE TABLE campaign_sources (
 id TEXT NOT NULL,
 campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('adventure', 'session', 'gm-correction')),
 title TEXT NOT NULL,
 anchor TEXT NOT NULL,
 excerpt TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(campaign_id, id)
);
CREATE TABLE campaign_records (
 id TEXT NOT NULL,
 campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('person', 'place', 'quest', 'fact')),
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision > 0),
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(campaign_id, id)
);
CREATE TABLE campaign_proposals (
 id TEXT NOT NULL,
 campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 source_id TEXT NOT NULL,
 target_id TEXT NOT NULL,
 expected_revision INTEGER NOT NULL CHECK(expected_revision >= 0),
 kind TEXT NOT NULL CHECK(kind IN ('person', 'place', 'quest', 'fact')),
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
 created_at INTEGER NOT NULL,
 decided_at INTEGER,
 decided_by TEXT REFERENCES user(id),
 PRIMARY KEY(campaign_id, id),
 FOREIGN KEY(campaign_id, source_id) REFERENCES campaign_sources(campaign_id, id),
 CHECK ((status = 'pending' AND decided_at IS NULL AND decided_by IS NULL)
   OR (status != 'pending' AND decided_at IS NOT NULL AND decided_by IS NOT NULL))
);
CREATE INDEX campaign_proposals_queue_idx ON campaign_proposals(campaign_id, status);
CREATE TABLE campaign_revisions (
 campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 record_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 proposal_id TEXT NOT NULL,
 previous_title TEXT,
 previous_content TEXT,
 previous_kind TEXT,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 kind TEXT NOT NULL,
 approved_by TEXT NOT NULL REFERENCES user(id),
 approved_at INTEGER NOT NULL,
 PRIMARY KEY(campaign_id, record_id, revision),
 UNIQUE(campaign_id, proposal_id),
 FOREIGN KEY(campaign_id, record_id) REFERENCES campaign_records(campaign_id, id),
 FOREIGN KEY(campaign_id, proposal_id) REFERENCES campaign_proposals(campaign_id, id)
);
-- A decision is one SQL statement. Trigger failure rolls back status, record and audit.
CREATE TRIGGER campaign_proposal_decision_guard BEFORE UPDATE ON campaign_proposals
BEGIN
 SELECT CASE WHEN OLD.status != 'pending' OR NEW.status NOT IN ('approved', 'rejected')
   THEN RAISE(ABORT, 'campaign_invalid_decision') END;
 SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.campaign_id IS NOT OLD.campaign_id
   OR NEW.source_id IS NOT OLD.source_id OR NEW.target_id IS NOT OLD.target_id
   OR NEW.expected_revision IS NOT OLD.expected_revision OR NEW.kind IS NOT OLD.kind
   OR NEW.title IS NOT OLD.title OR NEW.content IS NOT OLD.content OR NEW.created_at IS NOT OLD.created_at
   THEN RAISE(ABORT, 'campaign_proposal_immutable') END;
 SELECT CASE WHEN NOT EXISTS (
   SELECT 1 FROM campaigns WHERE id = NEW.campaign_id AND owner_id = NEW.decided_by
 ) THEN RAISE(ABORT, 'campaign_access_denied') END;
 SELECT CASE WHEN NEW.status = 'approved' AND NEW.expected_revision != COALESCE((
   SELECT revision FROM campaign_records WHERE campaign_id = NEW.campaign_id AND id = NEW.target_id
 ), 0) THEN RAISE(ABORT, 'campaign_revision_conflict') END;
END;
CREATE TRIGGER campaign_proposal_apply AFTER UPDATE OF status ON campaign_proposals
WHEN NEW.status = 'approved'
BEGIN
 -- Preserve the prior values before the upsert, while satisfying the record FK.
 INSERT INTO campaign_records(id, campaign_id, kind, title, content, revision, updated_at)
 VALUES(NEW.target_id, NEW.campaign_id, NEW.kind, NEW.title, NEW.content, 1, NEW.decided_at)
 ON CONFLICT(campaign_id, id) DO NOTHING;
 INSERT INTO campaign_revisions(
   campaign_id, record_id, revision, proposal_id, previous_title, previous_content, previous_kind,
   title, content, kind, approved_by, approved_at
 )
 SELECT NEW.campaign_id, NEW.target_id, NEW.expected_revision + 1, NEW.id,
   CASE WHEN NEW.expected_revision > 0 THEN title END,
   CASE WHEN NEW.expected_revision > 0 THEN content END,
   CASE WHEN NEW.expected_revision > 0 THEN kind END,
   NEW.title, NEW.content, NEW.kind, NEW.decided_by, NEW.decided_at
 FROM campaign_records WHERE campaign_id = NEW.campaign_id AND id = NEW.target_id;
 UPDATE campaign_records SET kind = NEW.kind, title = NEW.title, content = NEW.content,
   revision = NEW.expected_revision + 1, updated_at = NEW.decided_at
 WHERE campaign_id = NEW.campaign_id AND id = NEW.target_id;
END;
