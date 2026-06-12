CREATE TABLE timesheet_entries (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  timesheet_id INT NOT NULL,
  project_id   INT NOT NULL,
  hours        INT NOT NULL CHECK (hours >= 0),
  CONSTRAINT fk_entry_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_entry_project   FOREIGN KEY (project_id)   REFERENCES projects(id)   ON DELETE RESTRICT
);
