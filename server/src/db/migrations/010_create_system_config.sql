CREATE TABLE IF NOT EXISTS system_config (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  llm_provider           ENUM('gemini', 'groq') NOT NULL DEFAULT 'gemini',
  llm_api_key            VARCHAR(500) NOT NULL DEFAULT '',
  scheduler_interval_hrs INT          NOT NULL DEFAULT 4,
  max_weekly_hours       INT          NOT NULL DEFAULT 40
);

-- Ensure there is always exactly one config row
INSERT IGNORE INTO system_config (id, llm_provider, llm_api_key, scheduler_interval_hrs, max_weekly_hours)
VALUES (1, 'gemini', '', 4, 40);
