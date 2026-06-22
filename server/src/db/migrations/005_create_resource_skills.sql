CREATE TABLE resource_skills (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  resource_id       INT NOT NULL,
  skill_id          INT NOT NULL,
  proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
  CONSTRAINT fk_rs_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  CONSTRAINT fk_rs_skill     FOREIGN KEY (skill_id)     REFERENCES skills(id)     ON DELETE RESTRICT,
  CONSTRAINT uq_resource_skill UNIQUE (resource_id, skill_id)
);
