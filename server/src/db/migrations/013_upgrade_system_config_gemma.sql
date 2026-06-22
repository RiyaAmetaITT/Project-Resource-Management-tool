ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS llm_host VARCHAR(500) NOT NULL DEFAULT 'http://localhost:11434/v1' AFTER llm_provider;

ALTER TABLE system_config
  MODIFY llm_provider ENUM('gemini', 'groq', 'gemma') NOT NULL DEFAULT 'gemma';

UPDATE system_config
SET llm_provider = 'gemma',
    llm_host = COALESCE(NULLIF(llm_host, ''), 'http://localhost:11434/v1')
WHERE llm_provider IN ('gemini', 'groq');

ALTER TABLE system_config
  MODIFY llm_provider ENUM('gemma') NOT NULL DEFAULT 'gemma';
