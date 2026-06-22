import { parentPort } from 'worker_threads';
import dotenv from 'dotenv';
import path from 'path';

import { createSchedulerService } from '../bootstrap/createSchedulerService';

dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true });

const scheduler = createSchedulerService();

parentPort?.on('message', (message: { type: string }) => {
  if (message.type === 'stop') {
    scheduler.stop();
    process.exit(0);
  }
});

async function startWorker(): Promise<void> {
  try {
    await scheduler.start();
    parentPort?.postMessage({ status: 'started' });
  } catch (err: unknown) {
    console.error('[Scheduler Worker] Fatal error:', err);
    process.exit(1);
  }
}

void startWorker();
