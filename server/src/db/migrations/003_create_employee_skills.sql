CREATE TABLE IF NOT EXISTS employee_skills (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  employee_id       INT          NOT NULL,
  skill_name        VARCHAR(100) NOT NULL,
  category          ENUM('Backend', 'Frontend', 'DevOps', 'QA', 'Other') NOT NULL,
  proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
  CONSTRAINT fk_skill_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT uq_employee_skill UNIQUE (employee_id, skill_name)
);
