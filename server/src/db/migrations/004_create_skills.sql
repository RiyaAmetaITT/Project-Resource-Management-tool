CREATE TABLE skills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL UNIQUE,
  category   ENUM('Backend', 'Frontend', 'DevOps', 'QA', 'Other') NOT NULL
);
