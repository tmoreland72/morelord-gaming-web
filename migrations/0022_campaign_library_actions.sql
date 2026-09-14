CREATE TABLE campaign_library_actions (
 id TEXT NOT NULL, campaign_id TEXT NOT NULL REFERENCES campaigns(id), kind TEXT NOT NULL CHECK(kind IN ('merge','exclude','separate','restore')),
 records TEXT NOT NULL CHECK(json_valid(records)), keeper_id TEXT, content TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), created_at INTEGER NOT NULL, decided_at INTEGER, decided_by TEXT REFERENCES user(id),
 PRIMARY KEY(campaign_id,id), CHECK((status='pending' AND decided_at IS NULL AND decided_by IS NULL) OR (status!='pending' AND decided_at IS NOT NULL AND decided_by IS NOT NULL))
);
CREATE TABLE campaign_record_dispositions (
 campaign_id TEXT NOT NULL, record_id TEXT NOT NULL, canonical_id TEXT, action_id TEXT NOT NULL,
 PRIMARY KEY(campaign_id,record_id), FOREIGN KEY(campaign_id,record_id) REFERENCES campaign_records(campaign_id,id), FOREIGN KEY(campaign_id,canonical_id) REFERENCES campaign_records(campaign_id,id), FOREIGN KEY(campaign_id,action_id) REFERENCES campaign_library_actions(campaign_id,id), CHECK(record_id IS NOT canonical_id)
);
CREATE TABLE campaign_distinct_records (
 campaign_id TEXT NOT NULL, left_id TEXT NOT NULL,right_id TEXT NOT NULL,left_revision INTEGER NOT NULL,right_revision INTEGER NOT NULL,action_id TEXT NOT NULL,
 PRIMARY KEY(campaign_id,left_id,right_id), FOREIGN KEY(campaign_id,left_id) REFERENCES campaign_records(campaign_id,id), FOREIGN KEY(campaign_id,right_id) REFERENCES campaign_records(campaign_id,id), FOREIGN KEY(campaign_id,action_id) REFERENCES campaign_library_actions(campaign_id,id)
);
CREATE VIEW campaign_active_records AS SELECT r.* FROM campaign_records r WHERE NOT EXISTS(SELECT 1 FROM campaign_record_dispositions d WHERE d.campaign_id=r.campaign_id AND d.record_id=r.id);
CREATE VIEW campaign_record_identities AS SELECT r.campaign_id,r.id,CASE WHEN d.record_id IS NULL THEN r.id ELSE d.canonical_id END canonical_id FROM campaign_records r LEFT JOIN campaign_record_dispositions d ON d.campaign_id=r.campaign_id AND d.record_id=r.id;
CREATE VIEW campaign_effective_relationships AS SELECT * FROM (
 SELECT e.*,f.canonical_id canonical_from_id,t.canonical_id canonical_to_id,ROW_NUMBER() OVER(PARTITION BY e.campaign_id,f.canonical_id,e.kind,t.canonical_id ORDER BY e.approved_at DESC,e.id) position
 FROM campaign_relationships e JOIN campaign_record_identities f ON f.campaign_id=e.campaign_id AND f.id=e.from_id JOIN campaign_record_identities t ON t.campaign_id=e.campaign_id AND t.id=e.to_id
 WHERE f.canonical_id IS NOT NULL AND t.canonical_id IS NOT NULL AND f.canonical_id!=t.canonical_id AND EXISTS(SELECT 1 FROM campaign_active_records a WHERE a.campaign_id=e.campaign_id AND a.id=f.canonical_id) AND EXISTS(SELECT 1 FROM campaign_active_records a WHERE a.campaign_id=e.campaign_id AND a.id=t.canonical_id)
) WHERE position=1;
CREATE TRIGGER campaign_library_action_guard BEFORE UPDATE ON campaign_library_actions BEGIN
 SELECT CASE WHEN OLD.status!='pending' OR NEW.status NOT IN ('approved','rejected') THEN RAISE(ABORT,'library_already_decided') END;
 SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.campaign_id IS NOT OLD.campaign_id OR NEW.kind IS NOT OLD.kind OR NEW.records IS NOT OLD.records OR NEW.keeper_id IS NOT OLD.keeper_id OR NEW.content IS NOT OLD.content OR NEW.created_at IS NOT OLD.created_at THEN RAISE(ABORT,'library_immutable') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM campaigns WHERE id=NEW.campaign_id AND owner_id=NEW.decided_by) THEN RAISE(ABORT,'library_access_denied') END;
 SELECT CASE WHEN NEW.status='approved' AND EXISTS(
 SELECT 1 FROM json_each(NEW.records) j LEFT JOIN campaign_records r ON r.campaign_id=NEW.campaign_id AND r.id=json_extract(j.value,'$.id')
 WHERE r.id IS NULL OR r.revision!=json_extract(j.value,'$.revision') OR
 (NEW.kind!='restore' AND EXISTS(SELECT 1 FROM campaign_record_dispositions d WHERE d.campaign_id=r.campaign_id AND d.record_id=r.id)) OR
 (NEW.kind='restore' AND NOT EXISTS(SELECT 1 FROM campaign_record_dispositions d WHERE d.campaign_id=r.campaign_id AND d.record_id=r.id AND d.canonical_id IS NULL)) OR
 EXISTS(SELECT 1 FROM campaign_proposals p WHERE p.campaign_id=r.campaign_id AND p.target_id=r.id AND p.status='pending')
 ) THEN RAISE(ABORT,'library_stale') END;
END;
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
CREATE TRIGGER campaign_retired_record_approval BEFORE UPDATE OF status ON campaign_proposals WHEN NEW.status='approved' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM campaign_record_dispositions WHERE campaign_id=NEW.campaign_id AND record_id=NEW.target_id) THEN RAISE(ABORT,'library_record_retired') END;
END;
CREATE TRIGGER campaign_retired_relationship_approval BEFORE UPDATE OF status ON campaign_relationship_proposals WHEN NEW.status='approved' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM campaign_record_dispositions WHERE campaign_id=NEW.campaign_id AND record_id IN(NEW.from_id,NEW.to_id,NEW.evidence_record_id)) THEN RAISE(ABORT,'relationship_stale') END;
END;
