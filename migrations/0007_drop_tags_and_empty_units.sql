-- Tags are no longer collected or shown. The column stays (dropping a column
-- rebuilds the table), but what was stored is cleared so nothing outlives the
-- feature.
UPDATE ratings SET tags = '[]' WHERE tags <> '[]';
UPDATE teacher_stats SET tag_counts = '{}';

-- Two Business units with no teachers: nothing to rate and nothing to show.
DELETE FROM departments
WHERE slug IN ('cucba', 'english-teachers-business')
  AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.dept_slug = departments.slug);
