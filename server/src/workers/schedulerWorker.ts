import { parentPort } from 'worker_threads';
import dotenv from 'dotenv';
import path from 'path';

import { SchedulerService } from '../services/SchedulerService';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';

dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true });

const scheduler = new SchedulerService(
  new AllocationRepository(),
  new ResourceRepository(),
  new MilestoneRepository(),
  new ProjectRepository(),
  new SystemConfigRepository(),
  new TimesheetRepository(),
  new TimesheetEntryRepository(),
);

parentPort?.on('message', (message: { type: string }) => {
  if (message.type === 'stop') {
    scheduler.stop();
    process.exit(0);
  }
});

scheduler
  .start()
  .then(() => {
    parentPort?.postMessage({ status: 'started' });
  })
  .catch((err: unknown) => {
    console.error('[Scheduler Worker] Fatal error:', err);
    process.exit(1);
  });
