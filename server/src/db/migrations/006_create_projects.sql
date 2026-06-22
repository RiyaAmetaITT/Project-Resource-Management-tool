CREATE TABLE projects (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  start_date          DATE         NOT NULL,
  end_date            DATE         NOT NULL,
  total_story_points  INT NOT NULL DEFAULT 0,
  status              ENUM('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED') NOT NULL DEFAULT 'PLANNED',
  health_status       ENUM('ON_TRACK', 'ATTENTION', 'AT_RISK') NOT NULL DEFAULT 'ON_TRACK',
  manager_id          INT          NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE RESTRICT
);
