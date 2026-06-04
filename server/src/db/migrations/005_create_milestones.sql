CREATE TABLE IF NOT EXISTS milestones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  project_id   INT          NOT NULL,
  title        VARCHAR(200) NOT NULL,
  due_date     DATE         NOT NULL,
  story_points INT NOT NULL DEFAULT 0,
  status       ENUM('NOT_STARTED', 'IN_PROGRESS', 'DONE') NOT NULL DEFAULT 'NOT_STARTED',
  health_flag  ENUM('NORMAL', 'OVERDUE') NOT NULL DEFAULT 'NORMAL',
  CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
