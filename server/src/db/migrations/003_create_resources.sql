CREATE TABLE resources (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE,
  manager_id          INT          NULL,
  status              ENUM('BENCH', 'ALLOCATED') NOT NULL DEFAULT 'BENCH',
  total_utilisation   INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resource_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_resource_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);
