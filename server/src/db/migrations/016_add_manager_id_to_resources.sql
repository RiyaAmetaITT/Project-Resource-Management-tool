ALTER TABLE resources
  ADD COLUMN manager_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_resource_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

UPDATE resources res
INNER JOIN users u ON res.user_id = u.id
SET res.manager_id = u.manager_id
WHERE u.manager_id IS NOT NULL;
