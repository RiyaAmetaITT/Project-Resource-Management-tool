import cron from 'node-cron';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { Project } from '../models/Project';
import { Milestone } from '../models/Milestone';
import {
  ResourceStatus,
  HealthStatus,
  HealthFlag,
  MilestoneStatus,
} from '../types/enums';
import { getWeekStartDate, isFutureDate } from '../utils/dateUtils';
import {
  DAYS_IN_WEEK,
  MAX_UTILISATION_PERCENT,
  MISSED_TIMESHEET_HISTORY_WEEKS,
  LOW_HOURS_THRESHOLD_RATIO,
  HOURS_CRITICAL_THRESHOLD_RATIO,
  MILESTONE_APPROACHING_DAYS,
  STORY_POINTS_BEHIND_ATTENTION_GAP,
  STORY_POINTS_BEHIND_CRITICAL_GAP,
} from '../constants';
import { TimesheetNotificationService } from './TimesheetNotificationService';
import { ProjectHealthNotificationService } from './ProjectHealthNotificationService';
import { hasActiveAllocationDuringWeek } from '../utils/allocationWeekUtils';

export class SchedulerService {
  private scheduledTask: cron.ScheduledTask | null = null;
  private readonly timesheetNotificationService: TimesheetNotificationService;
  private readonly projectHealthNotificationService: ProjectHealthNotificationService;

  constructor(
    private readonly allocationRepository: AllocationRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configRepository: SystemConfigRepository,
    private readonly timesheetRepository: TimesheetRepository,
    private readonly timesheetEntryRepository: TimesheetEntryRepository,
    timesheetNotificationService: TimesheetNotificationService,
    projectHealthNotificationService: ProjectHealthNotificationService,
  ) {
    this.timesheetNotificationService = timesheetNotificationService;
    this.projectHealthNotificationService = projectHealthNotificationService;
  }

  async start(): Promise<void> {
    const config = await this.configRepository.getConfig();
    const intervalHours = config.schedulerIntervalHrs;
    const cronExpression = `0 */${intervalHours} * * *`;

    console.log(`[Scheduler] Starting — runs every ${intervalHours} hour(s).`);

    this.scheduledTask = cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Running periodic checks...');
      await this.runAllChecks();
    });

    await this.runAllChecks();
  }

  stop(): void {
    this.scheduledTask?.stop();
    console.log('[Scheduler] Stopped.');
  }

  async runAllChecks(): Promise<void> {
    await this.recomputeAllResourceUtilisations();
    await this.flagMissedTimesheets();
    await this.timesheetNotificationService.processNotifications();
    await this.flagOverdueMilestones();
    await this.computeAllProjectHealthStatuses();
  }

  private async recomputeAllResourceUtilisations(): Promise<void> {
    const resources = await this.resourceRepository.findAllActive();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const resource of resources) {
      const totalUtilisation = await this.allocationRepository.sumUtilisationInPeriod(
        resource.id,
        today,
        today,
      );
      const status = totalUtilisation > 0 ? ResourceStatus.ALLOCATED : ResourceStatus.BENCH;
      await this.resourceRepository.updateStatus(resource.id, status, totalUtilisation);
    }
  }

  private async flagMissedTimesheets(): Promise<void> {
    const resources = await this.resourceRepository.findAllActive();

    for (const resource of resources) {
      for (let i = 1; i <= MISSED_TIMESHEET_HISTORY_WEEKS; i++) {
        const weekStart = getWeekStartDate(new Date());
        weekStart.setDate(weekStart.getDate() - i * DAYS_IN_WEEK);

        if (this.isCurrentWeek(weekStart) || isFutureDate(weekStart)) continue;

        const hadAllocation = await hasActiveAllocationDuringWeek(
          this.allocationRepository,
          resource.id,
          weekStart,
        );
        if (!hadAllocation) continue;

        const existing = await this.timesheetRepository.findByResourceAndWeek(
          resource.id,
          weekStart,
        );
        if (!existing) {
          await this.timesheetRepository.saveMissed(resource.id, weekStart);
        }
      }
    }
  }

  private async flagOverdueMilestones(): Promise<void> {
    const overdueMilestones = await this.milestoneRepository.findIncompletePastDue();
    for (const milestone of overdueMilestones) {
      await this.milestoneRepository.flagOverdue(milestone.id);
    }
  }

  private async computeAllProjectHealthStatuses(): Promise<void> {
    const config = await this.configRepository.getConfig();
    const lastWeekStart = getWeekStartDate(new Date());
    lastWeekStart.setDate(lastWeekStart.getDate() - DAYS_IN_WEEK);

    const allProjects = await this.projectRepository.findAll();
    for (const project of allProjects) {
      const milestones = await this.milestoneRepository.findByProjectId(project.id);
      const allocations = await this.allocationRepository.findActiveByProject(project.id);
      const health = await this.determineProjectHealth(
        project,
        milestones,
        allocations,
        lastWeekStart,
        config.maxWeeklyHours,
      );
      await this.projectRepository.updateHealthStatus(project.id, health);
      await this.handleProjectHealthNotification(project, health);
    }
  }

  private async handleProjectHealthNotification(project: Project, health: HealthStatus): Promise<void> {
    if (health === HealthStatus.AT_RISK && !project.atRiskNotifiedAt) {
      await this.projectHealthNotificationService.notifyAtRisk(project.id, health);
      await this.projectRepository.markAtRiskNotified(project.id);
      return;
    }

    if (health !== HealthStatus.AT_RISK && project.atRiskNotifiedAt) {
      await this.projectRepository.clearAtRiskNotification(project.id);
    }
  }

  private async determineProjectHealth(
    project: Project,
    milestones: Milestone[],
    allocations: { resourceId: number; utilisationPercent: number }[],
    lastWeekStart: Date,
    maxWeeklyHours: number,
  ): Promise<HealthStatus> {
    const hasOverdueMilestone = milestones.some((m) => m.healthFlag === HealthFlag.OVERDUE);
    const hoursSeverity = await this.evaluateHoursSeverity(
      allocations,
      project.id,
      lastWeekStart,
      maxWeeklyHours,
    );
    const storyPointsSeverity = this.evaluateStoryPointsSeverity(project, milestones);

    if (hasOverdueMilestone || hoursSeverity === 'critical' || storyPointsSeverity === 'critical') {
      return HealthStatus.AT_RISK;
    }

    const hasMilestoneApproachingSoon = milestones.some((m) => {
      if (m.status === MilestoneStatus.DONE) return false;
      const daysUntilDue = this.daysUntilDate(new Date(m.dueDate));
      return daysUntilDue <= MILESTONE_APPROACHING_DAYS && daysUntilDue >= 0;
    });

    if (
      hasMilestoneApproachingSoon
      || hoursSeverity === 'low'
      || storyPointsSeverity === 'behind'
    ) {
      return HealthStatus.ATTENTION;
    }

    return HealthStatus.ON_TRACK;
  }

  private async evaluateHoursSeverity(
    allocations: { resourceId: number; utilisationPercent: number }[],
    projectId: number,
    weekStart: Date,
    maxWeeklyHours: number,
  ): Promise<'critical' | 'low' | 'ok'> {
    let worst: 'critical' | 'low' | 'ok' = 'ok';

    for (const allocation of allocations) {
      const expectedHours = Math.floor(
        (allocation.utilisationPercent / MAX_UTILISATION_PERCENT) * maxWeeklyHours,
      );
      if (expectedHours === 0) continue;

      const loggedHours = await this.getLoggedHoursForProjectWeek(
        allocation.resourceId,
        projectId,
        weekStart,
      );

      if (loggedHours < expectedHours * HOURS_CRITICAL_THRESHOLD_RATIO) {
        return 'critical';
      }
      if (loggedHours < expectedHours * LOW_HOURS_THRESHOLD_RATIO) {
        worst = 'low';
      }
    }

    return worst;
  }

  private evaluateStoryPointsSeverity(
    project: Project,
    milestones: Milestone[],
  ): 'critical' | 'behind' | 'ok' {
    if (project.totalStoryPoints <= 0) return 'ok';

    const completedStoryPoints = milestones
      .filter((m) => m.status === MilestoneStatus.DONE)
      .reduce((sum, m) => sum + m.storyPoints, 0);
    const progressRatio = completedStoryPoints / project.totalStoryPoints;
    const timeElapsedRatio = this.projectTimeElapsedRatio(project);

    if (progressRatio < timeElapsedRatio - STORY_POINTS_BEHIND_CRITICAL_GAP) {
      return 'critical';
    }
    if (progressRatio < timeElapsedRatio - STORY_POINTS_BEHIND_ATTENTION_GAP) {
      return 'behind';
    }

    return 'ok';
  }

  private projectTimeElapsedRatio(project: Project): number {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();

    if (end <= start) return 1;
    if (now <= start) return 0;
    if (now >= end) return 1;

    return (now - start) / (end - start);
  }

  private async getLoggedHoursForProjectWeek(
    resourceId: number,
    projectId: number,
    weekStart: Date,
  ): Promise<number> {
    const timesheet = await this.timesheetRepository.findByResourceAndWeek(resourceId, weekStart);
    if (!timesheet || timesheet.status === 'MISSED') return 0;

    const entries = await this.timesheetEntryRepository.findByTimesheetId(timesheet.id);
    return entries.find((e) => e.projectId === projectId)?.hours ?? 0;
  }

  private isCurrentWeek(weekStartDate: Date): boolean {
    const currentWeekStart = getWeekStartDate(new Date());
    return weekStartDate.getTime() === currentWeekStart.getTime();
  }

  private daysUntilDate(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
