require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function tryQuery(connection, sql) {
  try {
    await connection.query(sql);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await tryQuery(
    connection,
    "ALTER TABLE system_config ADD COLUMN llm_host VARCHAR(500) NOT NULL DEFAULT 'http://localhost:11434/v1' AFTER llm_provider",
  );

  await tryQuery(
    connection,
    "ALTER TABLE system_config MODIFY llm_provider ENUM('gemini', 'groq', 'gemma') NOT NULL DEFAULT 'gemma'",
  );

  await connection.query(
    "UPDATE system_config SET llm_provider = 'gemma', llm_host = 'http://localhost:11434/v1', llm_api_key = '' WHERE id = 1",
  );

  await tryQuery(
    connection,
    "ALTER TABLE system_config MODIFY llm_provider ENUM('gemma') NOT NULL DEFAULT 'gemma'",
  );

  const [rows] = await connection.query(
    'SELECT id, llm_provider, llm_host, llm_api_key FROM system_config WHERE id = 1',
  );
  console.log('Updated system_config:', rows[0]);
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
