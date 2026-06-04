CREATE TABLE IF NOT EXISTS allocations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  employee_id         INT NOT NULL,
  project_id          INT NOT NULL,
  utilisation_percent INT NOT NULL CHECK (utilisation_percent > 0 AND utilisation_percent <= 100),
  from_date           DATE NOT NULL,
  to_date             DATE NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_allocation_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocation_project  FOREIGN KEY (project_id)  REFERENCES projects(id)  ON DELETE RESTRICT,
  CONSTRAINT chk_allocation_dates   CHECK (from_date < to_date)
);
