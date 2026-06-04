CREATE TABLE IF NOT EXISTS timesheets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT  NOT NULL,
  week_start_date DATE NOT NULL,
  status          ENUM('SUBMITTED') NOT NULL DEFAULT 'SUBMITTED',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_timesheet_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT uq_timesheet_week     UNIQUE (employee_id, week_start_date)
);
