CREATE TABLE timesheets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  resource_id     INT  NOT NULL,
  week_start_date DATE NOT NULL,
  status          ENUM('SUBMITTED', 'MISSED') NOT NULL DEFAULT 'SUBMITTED',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_timesheet_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT,
  CONSTRAINT uq_resource_week UNIQUE (resource_id, week_start_date)
);
