ALTER TABLE product_features ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE product_features
SET sort_order = (
	SELECT COUNT(*)
	FROM product_features AS preceding
	INNER JOIN features AS preceding_feature ON preceding_feature.id = preceding.feature_id
	INNER JOIN features AS current_feature ON current_feature.id = product_features.feature_id
	WHERE preceding.product_id = product_features.product_id
		AND (
			CASE preceding.tier WHEN 'standard' THEN 1 WHEN 'premium' THEN 2 ELSE 3 END
			< CASE product_features.tier WHEN 'standard' THEN 1 WHEN 'premium' THEN 2 ELSE 3 END
			OR (
				preceding.tier = product_features.tier
				AND preceding_feature.name < current_feature.name
			)
		)
);
