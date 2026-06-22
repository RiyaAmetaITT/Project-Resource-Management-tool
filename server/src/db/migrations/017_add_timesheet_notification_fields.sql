ALTER TABLE resources
  ADD COLUMN timesheet_access_frozen   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN timesheet_frozen_week_start DATE NULL;

ALTER TABLE timesheets
  ADD COLUMN reminder_count        INT  NOT NULL DEFAULT 0,
  ADD COLUMN last_reminder_sent_at DATE NULL;
