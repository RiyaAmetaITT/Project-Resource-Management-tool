CREATE TABLE system_config (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  llm_provider           ENUM('gemma') NOT NULL DEFAULT 'gemma',
  llm_host               VARCHAR(500) NOT NULL DEFAULT 'http://localhost:11434/v1',
  llm_api_key            VARCHAR(500) NOT NULL DEFAULT '',
  scheduler_interval_hrs INT          NOT NULL DEFAULT 4,
  max_weekly_hours       INT          NOT NULL DEFAULT 40
);

INSERT INTO system_config (id, llm_provider, llm_host, llm_api_key, scheduler_interval_hrs, max_weekly_hours)
VALUES (1, 'gemma', 'http://localhost:11434/v1', '', 4, 40);
