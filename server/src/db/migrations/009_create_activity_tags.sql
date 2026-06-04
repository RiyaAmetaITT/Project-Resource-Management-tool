CREATE TABLE IF NOT EXISTS activity_tags (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  timesheet_entry_id INT          NOT NULL,
  tag_name           VARCHAR(100) NOT NULL,
  CONSTRAINT fk_tag_entry FOREIGN KEY (timesheet_entry_id) REFERENCES timesheet_entries(id) ON DELETE CASCADE
);
