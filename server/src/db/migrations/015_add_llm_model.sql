ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100) NOT NULL DEFAULT 'gemma3:12b-it-q8_0' AFTER llm_host;

UPDATE system_config
SET llm_model = 'gemma3:12b-it-q8_0'
WHERE id = 1;
