DROP TRIGGER campaign_proposals_archived_update;
--> statement-breakpoint
DROP TRIGGER campaign_proposal_decision_guard;
--> statement-breakpoint
-- Preserve existing campaign rows and foreign keys while expanding the constrained category column.
DROP TRIGGER campaign_category_immutable;
--> statement-breakpoint
DROP TRIGGER campaign_library_action_apply;
--> statement-breakpoint
ALTER TABLE campaign_proposals RENAME COLUMN category TO legacy_category;
--> statement-breakpoint
ALTER TABLE campaign_proposals ADD COLUMN category TEXT NOT NULL DEFAULT 'reference' CHECK(category IN ('location','npc','quest','character','faction','deity','lore','reference'));
--> statement-breakpoint
UPDATE campaign_proposals SET category=legacy_category;
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TRIGGER campaign_proposals_archived_update BEFORE UPDATE ON campaign_proposals WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_category_immutable BEFORE UPDATE OF category ON campaign_proposals WHEN NEW.category IS NOT OLD.category BEGIN
 SELECT RAISE(ABORT,'campaign_proposal_immutable');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_library_action_apply AFTER UPDATE OF status ON campaign_library_actions WHEN NEW.status='approved' BEGIN
 INSERT INTO campaign_proposals(id,campaign_id,source_id,target_id,expected_revision,kind,title,content,category,created_at)
 SELECT NEW.id,r.campaign_id,p.source_id,r.id,r.revision,r.kind,r.title,NEW.content,p.category,NEW.decided_at FROM campaign_records r JOIN campaign_revisions v ON v.campaign_id=r.campaign_id AND v.record_id=r.id AND v.revision=r.revision JOIN campaign_proposals p ON p.campaign_id=v.campaign_id AND p.id=v.proposal_id WHERE NEW.kind='merge' AND r.campaign_id=NEW.campaign_id AND r.id=NEW.keeper_id;
 UPDATE campaign_proposals SET status='approved',decided_by=NEW.decided_by,decided_at=NEW.decided_at WHERE NEW.kind='merge' AND campaign_id=NEW.campaign_id AND id=NEW.id;
 -- Flatten prior redirects when their canonical record is consolidated or excluded.
 UPDATE campaign_record_dispositions SET canonical_id=CASE WHEN NEW.kind='merge' THEN NEW.keeper_id ELSE NULL END,action_id=NEW.id WHERE NEW.kind='merge' AND campaign_id=NEW.campaign_id AND canonical_id IN (SELECT json_extract(value,'$.id') FROM json_each(NEW.records) WHERE json_extract(value,'$.id') IS NOT NEW.keeper_id);
 INSERT INTO campaign_record_dispositions(campaign_id,record_id,canonical_id,action_id)
 SELECT NEW.campaign_id,json_extract(value,'$.id'),CASE WHEN NEW.kind='merge' THEN NEW.keeper_id ELSE NULL END,NEW.id FROM json_each(NEW.records) WHERE NEW.kind IN ('merge','exclude') AND json_extract(value,'$.id') IS NOT NEW.keeper_id;
 INSERT INTO campaign_distinct_records(campaign_id,left_id,right_id,left_revision,right_revision,action_id)
 SELECT NEW.campaign_id,json_extract(a.value,'$.id'),json_extract(b.value,'$.id'),json_extract(a.value,'$.revision'),json_extract(b.value,'$.revision'),NEW.id FROM json_each(NEW.records) a JOIN json_each(NEW.records) b ON json_extract(a.value,'$.id')<json_extract(b.value,'$.id') WHERE NEW.kind='separate'
 ON CONFLICT(campaign_id,left_id,right_id) DO UPDATE SET left_revision=excluded.left_revision,right_revision=excluded.right_revision,action_id=excluded.action_id;
 DELETE FROM campaign_record_dispositions WHERE NEW.kind='restore' AND campaign_id=NEW.campaign_id AND canonical_id IS NULL AND record_id IN(SELECT json_extract(value,'$.id') FROM json_each(NEW.records));
END;
--> statement-breakpoint
CREATE TABLE campaign_foundry_connections (
 campaign_id TEXT PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
 token_hash TEXT UNIQUE,
 world_key TEXT UNIQUE,
 world_id TEXT,
 world_name TEXT,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE campaign_foundry_documents (
 campaign_id TEXT NOT NULL,
 proposal_id TEXT NOT NULL,
 world_key TEXT NOT NULL,
 document_uuid TEXT NOT NULL,
 references_json TEXT NOT NULL CHECK(json_valid(references_json)),
 PRIMARY KEY(campaign_id,proposal_id),
 FOREIGN KEY(campaign_id,proposal_id) REFERENCES campaign_proposals(campaign_id,id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX campaign_foundry_document_lookup ON campaign_foundry_documents(campaign_id,world_key,document_uuid);
--> statement-breakpoint
CREATE TRIGGER campaign_foundry_reference_copy AFTER INSERT ON campaign_proposals BEGIN
 INSERT OR IGNORE INTO campaign_foundry_documents(campaign_id,proposal_id,world_key,document_uuid,references_json)
 SELECT NEW.campaign_id,NEW.id,d.world_key,d.document_uuid,d.references_json
 FROM campaign_foundry_documents d JOIN campaign_proposals p ON p.campaign_id=d.campaign_id AND p.id=d.proposal_id
 WHERE p.campaign_id=NEW.campaign_id AND p.source_id=NEW.source_id AND p.target_id=NEW.target_id AND p.id!=NEW.id
 ORDER BY p.created_at DESC,p.id DESC LIMIT 1;
END;
