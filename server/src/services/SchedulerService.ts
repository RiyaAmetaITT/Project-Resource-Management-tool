import cron from 'node-cron';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { EmployeeStatus, HealthStatus } from '../types/enums';

export class SchedulerService {
  private scheduledTask: cron.ScheduledTask | null = null;

  constructor(
    private readonly allocationRepository: AllocationRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configRepository: SystemConfigRepository,
  ) {}

  async start(): Promise<void> {
    const config = await this.configRepository.getConfig();
    const intervalHours = config.schedulerIntervalHrs;
    const cronExpression = `0 */${intervalHours} * * *`; // Every N hours at minute 0

    console.log(`[Scheduler] Starting — runs every ${intervalHours} hour(s).`);

    this.scheduledTask = cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Running periodic checks...');
      await this.runAllChecks();
    });

    // Run immediately on startup as well
    await this.runAllChecks();
  }

  stop(): void {
    this.scheduledTask?.stop();
    console.log('[Scheduler] Stopped.');
  }

  /** Runs all three scheduled jobs in sequence. Public for testing. */
  async runAllChecks(): Promise<void> {
    await this.recomputeAllEmployeeUtilisations();
    await this.flagOverdueMilestones();
    await this.computeAllProjectHealthStatuses();
  }

  // ── Step 1: Recompute employee utilisation and BENCH/ALLOCATED status ─────

  private async recomputeAllEmployeeUtilisations(): Promise<void> {
    const allEmployees = await this.employeeRepository.findAllActive();

    for (const employee of allEmployees) {
      const activeAllocations = await this.allocationRepository.findActiveByEmployee(employee.id);
      const totalUtilisation = activeAllocations.reduce((sum, a) => sum + a.utilisationPercent, 0);
      const status = totalUtilisation > 0 ? EmployeeStatus.ALLOCATED : EmployeeStatus.BENCH;
      await this.employeeRepository.updateStatus(employee.id, status, totalUtilisation);
    }
  }

  // ── Step 2: Flag milestones as OVERDUE ────────────────────────────────────

  private async flagOverdueMilestones(): Promise<void> {
    const overdueMilestones = await this.milestoneRepository.findIncompletePastDue();
    for (const milestone of overdueMilestones) {
      await this.milestoneRepository.flagOverdue(milestone.id);
    }
  }

  // ── Step 3: Compute project health status ─────────────────────────────────

  private async computeAllProjectHealthStatuses(): Promise<void> {
    const allProjects = await this.projectRepository.findAll();
    for (const project of allProjects) {
      const health = await this.determineProjectHealth(project.id);
      await this.projectRepository.updateHealthStatus(project.id, health);
    }
  }

  private async determineProjectHealth(projectId: number): Promise<HealthStatus> {
    const milestones = await this.milestoneRepository.findByProjectId(projectId);
    const hasOverdueMilestone = milestones.some((m) => m.healthFlag === 'OVERDUE');

    if (hasOverdueMilestone) return HealthStatus.AT_RISK;

    const hasMilestoneApproachingSoon = milestones.some((m) => {
      if (m.status === 'DONE') return false;
      const daysUntilDue = this.daysUntilDate(new Date(m.dueDate));
      return daysUntilDue <= 7 && daysUntilDue >= 0;
    });

    if (hasMilestoneApproachingSoon) return HealthStatus.ATTENTION;
    return HealthStatus.ON_TRACK;
  }

  private daysUntilDate(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = date.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
