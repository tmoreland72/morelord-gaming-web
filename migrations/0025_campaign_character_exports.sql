ALTER TABLE campaign_foundry_documents ADD COLUMN character_export_json TEXT CHECK(character_export_json IS NULL OR json_valid(character_export_json));
--> statement-breakpoint
DROP TRIGGER campaign_foundry_reference_copy;
--> statement-breakpoint
CREATE TRIGGER campaign_foundry_reference_copy AFTER INSERT ON campaign_proposals BEGIN
 INSERT OR IGNORE INTO campaign_foundry_documents(campaign_id,proposal_id,world_key,document_uuid,references_json,character_export_json)
 SELECT NEW.campaign_id,NEW.id,d.world_key,d.document_uuid,d.references_json,d.character_export_json
 FROM campaign_foundry_documents d JOIN campaign_proposals p ON p.campaign_id=d.campaign_id AND p.id=d.proposal_id
 WHERE p.campaign_id=NEW.campaign_id AND p.source_id=NEW.source_id AND p.target_id=NEW.target_id AND p.id!=NEW.id
 ORDER BY p.created_at DESC,p.id DESC LIMIT 1;
END;
