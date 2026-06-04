CREATE TABLE IF NOT EXISTS employees (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT          NOT NULL UNIQUE,
  manager_id         INT          NULL,
  name               VARCHAR(100) NOT NULL,
  email              VARCHAR(255) NOT NULL UNIQUE,
  department         VARCHAR(100) NOT NULL,
  designation        VARCHAR(100) NOT NULL,
  status             ENUM('BENCH', 'ALLOCATED') NOT NULL DEFAULT 'BENCH',
  total_utilisation  INT NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employee_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);
