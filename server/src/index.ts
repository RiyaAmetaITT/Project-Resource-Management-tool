import dotenv from 'dotenv';
import path from 'path';

import { createApp } from './app';
import { SchedulerService } from './services/SchedulerService';
import { AllocationRepository } from './repositories/AllocationRepository';
import { EmployeeRepository } from './repositories/EmployeeRepository';
import { MilestoneRepository } from './repositories/MilestoneRepository';
import { ProjectRepository } from './repositories/ProjectRepository';
import { SystemConfigRepository } from './repositories/SystemConfigRepository';

dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

const PORT = Number(process.env.PORT ?? 3000);
const app = createApp();

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\nPRM Tool Server running on http://localhost:${PORT}`);
  await startScheduler();
});

async function startScheduler(): Promise<void> {
  const scheduler = new SchedulerService(
    new AllocationRepository(),
    new EmployeeRepository(),
    new MilestoneRepository(),
    new ProjectRepository(),
    new SystemConfigRepository(),
  );
  await scheduler.start();
}

export default app;
