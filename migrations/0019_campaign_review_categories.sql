ALTER TABLE campaign_proposals ADD COLUMN category TEXT NOT NULL DEFAULT 'reference' CHECK(category IN ('location','npc','quest','faction','reference'));
CREATE TRIGGER campaign_category_immutable BEFORE UPDATE OF category ON campaign_proposals
WHEN NEW.category IS NOT OLD.category
BEGIN
 SELECT RAISE(ABORT, 'campaign_proposal_immutable');
END;
