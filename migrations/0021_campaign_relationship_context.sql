--> statement-breakpoint
CREATE TABLE campaign_relationship_proposals_expanded (
 id TEXT NOT NULL,
 campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 from_id TEXT NOT NULL,
 to_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('member_of','former_member_of','mentored_by','located_in','takes_place_at','commissioned_by','leads','stronghold_of','waypoint_for','controlled_by','adjacent_to')),
 from_revision INTEGER NOT NULL,
 to_revision INTEGER NOT NULL,
 evidence_record_id TEXT NOT NULL,
 evidence_revision INTEGER NOT NULL,
 evidence TEXT NOT NULL CHECK(length(evidence)>0),
 scope TEXT NOT NULL DEFAULT 'adventure' CHECK(scope='adventure'),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at INTEGER NOT NULL,
 decided_at INTEGER,
 decided_by TEXT REFERENCES user(id),
 PRIMARY KEY(campaign_id,id),
 FOREIGN KEY(campaign_id,from_id) REFERENCES campaign_records(campaign_id,id),
 FOREIGN KEY(campaign_id,to_id) REFERENCES campaign_records(campaign_id,id),
 FOREIGN KEY(campaign_id,evidence_record_id,evidence_revision) REFERENCES campaign_revisions(campaign_id,record_id,revision),
 CHECK(from_id!=to_id),
 CHECK((status='pending' AND decided_by IS NULL AND decided_at IS NULL) OR (status!='pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO campaign_relationship_proposals_expanded SELECT * FROM campaign_relationship_proposals;
--> statement-breakpoint
CREATE TABLE campaign_relationships_preserved AS SELECT * FROM campaign_relationships;
--> statement-breakpoint
DROP TRIGGER campaign_relationship_decision_guard;
--> statement-breakpoint
DROP TRIGGER campaign_relationship_apply;
--> statement-breakpoint
DROP TABLE campaign_relationships;
--> statement-breakpoint
DROP TABLE campaign_relationship_proposals;
--> statement-breakpoint
ALTER TABLE campaign_relationship_proposals_expanded RENAME TO campaign_relationship_proposals;
--> statement-breakpoint
CREATE INDEX campaign_relationship_queue ON campaign_relationship_proposals(campaign_id,status);
--> statement-breakpoint
CREATE TABLE campaign_relationships (
 id TEXT NOT NULL,
 campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 from_id TEXT NOT NULL,
 to_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 proposal_id TEXT NOT NULL,
 approved_at INTEGER NOT NULL,
 approved_by TEXT NOT NULL REFERENCES user(id),
 PRIMARY KEY(campaign_id,id),
 UNIQUE(campaign_id,from_id,kind,to_id),
 FOREIGN KEY(campaign_id,from_id) REFERENCES campaign_records(campaign_id,id),
 FOREIGN KEY(campaign_id,to_id) REFERENCES campaign_records(campaign_id,id),
 FOREIGN KEY(campaign_id,proposal_id) REFERENCES campaign_relationship_proposals(campaign_id,id)
);
--> statement-breakpoint
INSERT INTO campaign_relationships SELECT * FROM campaign_relationships_preserved;
--> statement-breakpoint
DROP TABLE campaign_relationships_preserved;
--> statement-breakpoint
CREATE TRIGGER campaign_relationship_decision_guard BEFORE UPDATE ON campaign_relationship_proposals
BEGIN
 SELECT CASE WHEN OLD.status!='pending' OR NEW.status NOT IN ('approved','rejected') THEN RAISE(ABORT,'relationship_invalid_decision') END;
 SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.campaign_id IS NOT OLD.campaign_id OR NEW.from_id IS NOT OLD.from_id OR NEW.to_id IS NOT OLD.to_id OR NEW.kind IS NOT OLD.kind OR NEW.from_revision IS NOT OLD.from_revision OR NEW.to_revision IS NOT OLD.to_revision OR NEW.evidence_record_id IS NOT OLD.evidence_record_id OR NEW.evidence_revision IS NOT OLD.evidence_revision OR NEW.evidence IS NOT OLD.evidence OR NEW.scope IS NOT OLD.scope OR NEW.created_at IS NOT OLD.created_at THEN RAISE(ABORT,'relationship_immutable') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND owner_id=NEW.decided_by) THEN RAISE(ABORT,'relationship_access_denied') END;
 SELECT CASE WHEN NEW.status='approved' AND (
 NOT EXISTS(SELECT 1 FROM campaign_records WHERE campaign_id=NEW.campaign_id AND id=NEW.from_id AND revision=NEW.from_revision) OR
 NOT EXISTS(SELECT 1 FROM campaign_records WHERE campaign_id=NEW.campaign_id AND id=NEW.to_id AND revision=NEW.to_revision) OR
 NOT EXISTS(SELECT 1 FROM campaign_records WHERE campaign_id=NEW.campaign_id AND id=NEW.evidence_record_id AND revision=NEW.evidence_revision AND instr(content,NEW.evidence)>0)
 ) THEN RAISE(ABORT,'relationship_stale') END;
END;
--> statement-breakpoint
CREATE TRIGGER campaign_relationship_apply AFTER UPDATE OF status ON campaign_relationship_proposals WHEN NEW.status='approved'
BEGIN
 INSERT INTO campaign_relationships(id,campaign_id,from_id,to_id,kind,proposal_id,approved_at,approved_by)
 VALUES(NEW.id,NEW.campaign_id,NEW.from_id,NEW.to_id,NEW.kind,NEW.id,NEW.decided_at,NEW.decided_by)
 ON CONFLICT(campaign_id,from_id,kind,to_id) DO UPDATE SET proposal_id=NEW.id,approved_at=NEW.decided_at,approved_by=NEW.decided_by;
END;
