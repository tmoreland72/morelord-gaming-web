ALTER TABLE campaigns ADD COLUMN archived_at INTEGER;
--> statement-breakpoint
CREATE INDEX campaigns_owner_archive_idx ON campaigns(owner_id, archived_at);
--> statement-breakpoint
CREATE TRIGGER campaign_sources_archived_insert BEFORE INSERT ON campaign_sources WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_sources_archived_update BEFORE UPDATE ON campaign_sources WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_proposals_archived_insert BEFORE INSERT ON campaign_proposals WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_proposals_archived_update BEFORE UPDATE ON campaign_proposals WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_relationship_proposals_archived_insert BEFORE INSERT ON campaign_relationship_proposals WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_relationship_proposals_archived_update BEFORE UPDATE ON campaign_relationship_proposals WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_library_actions_archived_insert BEFORE INSERT ON campaign_library_actions WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_library_actions_archived_update BEFORE UPDATE ON campaign_library_actions WHEN EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND archived_at IS NOT NULL) BEGIN
 SELECT RAISE(ABORT,'campaign_archived');
END;
--> statement-breakpoint
CREATE TRIGGER campaign_delete_contents BEFORE DELETE ON campaigns BEGIN
 DELETE FROM campaign_relationships WHERE campaign_id=OLD.id;
 DELETE FROM campaign_relationship_proposals WHERE campaign_id=OLD.id;
 DELETE FROM campaign_distinct_records WHERE campaign_id=OLD.id;
 DELETE FROM campaign_record_dispositions WHERE campaign_id=OLD.id;
 DELETE FROM campaign_revisions WHERE campaign_id=OLD.id;
 DELETE FROM campaign_proposals WHERE campaign_id=OLD.id;
 DELETE FROM campaign_records WHERE campaign_id=OLD.id;
 DELETE FROM campaign_sources WHERE campaign_id=OLD.id;
 DELETE FROM campaign_library_actions WHERE campaign_id=OLD.id;
END;
