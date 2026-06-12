require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [existing] = await connection.query('SELECT id FROM system_config WHERE id = 1');
  if (existing.length > 0) {
    console.log('system_config row already exists:', existing[0]);
    await connection.end();
    return;
  }

  await connection.query(
    `INSERT INTO system_config
      (id, llm_provider, llm_host, llm_model, llm_api_key, scheduler_interval_hrs, max_weekly_hours)
     VALUES (1, 'gemma', '', 'gemma3:12b-it-q8_0', '', 4, 40)`,
  );

  const [rows] = await connection.query(
    'SELECT id, llm_provider, llm_host, llm_model, llm_api_key, scheduler_interval_hrs, max_weekly_hours FROM system_config WHERE id = 1',
  );
  console.log('Restored system_config:', rows[0]);
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
