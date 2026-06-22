import dotenv from 'dotenv';
import path from 'path';

import { createApp } from './app';
import { startSchedulerWorker } from './workers/startSchedulerWorker';

dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

const PORT = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(PORT, async () => {
  console.log(`\nPRM Tool Server running on http://localhost:${PORT}`);
  console.log(`API documentation: http://localhost:${PORT}/api-docs`);
  startSchedulerWorker();
});

export default app;
