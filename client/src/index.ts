import { loginScreen } from './screens/loginScreen';
import { clearScreen } from './utils/consoleUi';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

async function start() {
  clearScreen();
  await loginScreen();
}

start().catch((err) => {
  console.error('\nFatal Error:', err);
  process.exit(1);
});
