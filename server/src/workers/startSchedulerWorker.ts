import { Worker } from 'worker_threads';
import path from 'path';

let schedulerWorker: Worker | null = null;

export function startSchedulerWorker(): void {
  const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
  const workerPath = path.join(__dirname, `schedulerWorker${extension}`);
  const workerOptions = extension === '.ts'
    ? { execArgv: ['-r', 'ts-node/register'] as string[] }
    : {};

  schedulerWorker = new Worker(workerPath, workerOptions);

  schedulerWorker.on('message', (message: { status?: string }) => {
    if (message.status === 'started') {
      console.log('[Scheduler] Background worker started on separate thread.');
    }
  });

  schedulerWorker.on('error', (err) => {
    console.error('[Scheduler] Worker error:', err);
  });

  schedulerWorker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[Scheduler] Worker exited with code ${code}.`);
    }
    schedulerWorker = null;
  });
}

export function stopSchedulerWorker(): void {
  schedulerWorker?.postMessage({ type: 'stop' });
}
