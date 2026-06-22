import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import {
  SubmitTimesheetDto,
  TimesheetResponseDto,
  TeamTimesheetRowDto,
  EmployeeWeekTimesheetDetailDto,
  SubmitTimesheetContextDto,
  MissedTimesheetCheckDto,
} from '../dtos/timesheet.dto';
import { AppError } from '../errors/AppError';
import { parseDate, getWeekStartDate, isFutureDate, formatDate } from '../utils/dateUtils';
import { hasActiveAllocationDuringWeek } from '../utils/allocationWeekUtils';
import { DAYS_IN_WEEK, MAX_UTILISATION_PERCENT, MISSED_TIMESHEET_HISTORY_WEEKS } from '../constants';

export class TimesheetService {
  constructor(
    private readonly timesheetRepository: TimesheetRepository,
    private readonly entryRepository: TimesheetEntryRepository,
    private readonly tagRepository: ActivityTagRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configRepository: SystemConfigRepository,
  ) {}

  async submitTimesheet(resourceId: number, dto: SubmitTimesheetDto): Promise<void> {
    const profile = await this.resourceRepository.findProfileById(resourceId);
    if (profile?.timesheetAccessFrozen) {
      throw AppError.forbidden(
        'Your timesheet submission access is frozen. Contact your manager to restore access.',
      );
    }

    const config = await this.configRepository.getConfig();
    const weekStartDate = parseDate(dto.weekStartDate);

    this.assertNotFutureWeek(weekStartDate);
    await this.assertNoDuplicateSubmission(resourceId, weekStartDate);

    const totalHours = dto.entries.reduce((sum, e) => sum + e.hours, 0);
    this.assertTotalHoursWithinLimit(totalHours, config.maxWeeklyHours);

    const weekAllocations = await this.getAllocationsForWeek(resourceId, weekStartDate);
    if (weekAllocations.length === 0) {
      throw AppError.badRequest('You have no project allocations for this week.');
    }

    for (const entry of dto.entries) {
      const allocation = weekAllocations.find((a) => a.projectId === entry.projectId);
      if (!allocation) {
        throw AppError.badRequest(
          `You are not allocated to project ${entry.projectId} during this week.`,
        );
      }
      if (entry.hours > 0 && entry.activityTags.length === 0) {
        throw AppError.badRequest(
          `Activity tags are required when logging hours for project ${entry.projectId}.`,
        );
      }
      const maxHoursForProject = Math.floor(
        (allocation.utilisationPercent / MAX_UTILISATION_PERCENT) * config.maxWeeklyHours,
      );
      if (entry.hours > maxHoursForProject) {
        throw AppError.badRequest(
          `Hours for project ${entry.projectId} exceed your allocated max of ${maxHoursForProject} hrs.`,
        );
      }
    }

    const timesheet = await this.timesheetRepository.save({ resourceId, weekStartDate });

    for (const entry of dto.entries) {
      const savedEntry = await this.entryRepository.save({
        timesheetId: timesheet.id,
        projectId: entry.projectId,
        hours: entry.hours,
      });
      for (const tagName of entry.activityTags) {
        await this.tagRepository.save({ timesheetEntryId: savedEntry.id, tagName });
      }
    }
  }

  async getMyTimesheets(resourceId: number): Promise<TimesheetResponseDto[]> {
    const profile = await this.resourceRepository.findProfileById(resourceId);
    const submitted = await this.timesheetRepository.findByResourceId(resourceId);
    const submittedByWeek = new Map(
      submitted.map((ts) => [formatDate(new Date(ts.weekStartDate)), ts]),
    );

    const rows: TimesheetResponseDto[] = [];

    for (let i = 0; i < MISSED_TIMESHEET_HISTORY_WEEKS; i++) {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - i * DAYS_IN_WEEK);

      if (isFutureDate(weekStart) || this.isCurrentWeek(weekStart)) continue;

      const hadAllocation = await hasActiveAllocationDuringWeek(
        this.allocationRepository,
        resourceId,
        weekStart,
      );
      if (!hadAllocation) continue;

      const existing = submittedByWeek.get(formatDate(weekStart));
      if (existing) {
        const entries = existing.status === 'MISSED'
          ? []
          : await this.entryRepository.findByTimesheetId(existing.id);
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        rows.push({
          id: existing.id,
          employeeId: existing.resourceId,
          employeeName: profile?.fullName ?? 'Unknown',
          weekStartDate: existing.weekStartDate,
          totalHours,
          status: existing.status,
        });
      } else {
        rows.push({
          id: 0,
          employeeId: resourceId,
          employeeName: profile?.fullName ?? 'Unknown',
          weekStartDate: weekStart,
          totalHours: 0,
          status: 'MISSED',
        });
      }
    }

    return rows.sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());
  }

  async getEmployeeWeekDetail(
    resourceId: number,
    weekStartDate: Date,
  ): Promise<EmployeeWeekTimesheetDetailDto> {
    const profile = await this.resourceRepository.findProfileById(resourceId);
    const timesheet = await this.timesheetRepository.findByResourceAndWeek(resourceId, weekStartDate);
    const allocations = await this.getAllocationsForWeek(resourceId, weekStartDate);

    if (!timesheet) {
      const weekIsComplete = !this.isCurrentWeek(weekStartDate) && !isFutureDate(weekStartDate);
      return {
        employeeName: profile?.fullName ?? 'Unknown',
        weekStartDate: formatDate(weekStartDate),
        status: weekIsComplete && allocations.length > 0 ? 'MISSED' : 'SUBMITTED',
        entries: [],
        totalHours: 0,
      };
    }

    if (timesheet.status === 'MISSED') {
      return {
        employeeName: profile?.fullName ?? 'Unknown',
        weekStartDate: formatDate(weekStartDate),
        status: 'MISSED',
        entries: [],
        totalHours: 0,
      };
    }

    const rawEntries = await this.entryRepository.findByTimesheetId(timesheet.id);
    const entries = await Promise.all(
      rawEntries.map(async (entry) => {
        const project = await this.projectRepository.findById(entry.projectId);
        const tags = await this.tagRepository.findByTimesheetEntryId(entry.id);
        return {
          projectId: entry.projectId,
          projectName: project?.name ?? 'Unknown',
          hours: entry.hours,
          activityTags: tags.map((t) => t.tagName),
        };
      }),
    );

    return {
      employeeName: profile?.fullName ?? 'Unknown',
      weekStartDate: formatDate(weekStartDate),
      status: 'SUBMITTED',
      entries,
      totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
    };
  }

  async getTeamTimesheets(managerId: number, weekStartDate: Date): Promise<TeamTimesheetRowDto[]> {
    const resources = await this.resourceRepository.findByManagerId(managerId);
    const rows: TeamTimesheetRowDto[] = [];
    const weekIsComplete = !this.isCurrentWeek(weekStartDate) && !isFutureDate(weekStartDate);

    for (const resource of resources) {
      const allocations = await this.getAllocationsForWeek(resource.id, weekStartDate);
      if (allocations.length === 0) continue;

      const timesheet = await this.timesheetRepository.findByResourceAndWeek(resource.id, weekStartDate);
      const entries = timesheet ? await this.entryRepository.findByTimesheetId(timesheet.id) : [];

      for (const allocation of allocations) {
        const project = await this.projectRepository.findById(allocation.projectId);
        const entry = entries.find((e) => e.projectId === allocation.projectId);

        if (entry) {
          rows.push({
            employeeId: resource.id,
            employeeName: resource.fullName,
            projectId: allocation.projectId,
            projectName: project?.name ?? 'Unknown',
            hours: entry.hours,
            status: 'SUBMITTED',
          });
        } else if (weekIsComplete) {
          rows.push({
            employeeId: resource.id,
            employeeName: resource.fullName,
            projectId: allocation.projectId,
            projectName: project?.name ?? 'Unknown',
            hours: 0,
            status: 'MISSED',
          });
        }
      }
    }

    return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  async getSubmitContext(resourceId: number, weekStartDate: Date): Promise<SubmitTimesheetContextDto> {
    const config = await this.configRepository.getConfig();
    const profile = await this.resourceRepository.findProfileById(resourceId);
    const weekAllocations = await this.getAllocationsForWeek(resourceId, weekStartDate);

    const allocations = await Promise.all(
      weekAllocations.map(async (allocation) => {
        const project = await this.projectRepository.findById(allocation.projectId);
        const maxHours = Math.floor(
          (allocation.utilisationPercent / MAX_UTILISATION_PERCENT) * config.maxWeeklyHours,
        );
        return {
          projectId: allocation.projectId,
          projectName: project?.name ?? 'Unknown',
          utilisationPercent: allocation.utilisationPercent,
          maxHours,
        };
      }),
    );

    return {
      employeeName: profile?.fullName ?? 'Unknown',
      weekStartDate: formatDate(weekStartDate),
      maxWeeklyHours: config.maxWeeklyHours,
      timesheetAccessFrozen: profile?.timesheetAccessFrozen ?? false,
      allocations,
    };
  }

  async hasMissedCurrentWeek(resourceId: number): Promise<MissedTimesheetCheckDto> {
    const profile = await this.resourceRepository.findProfileById(resourceId);
    const lastWeekStart = getWeekStartDate(new Date());
    lastWeekStart.setDate(lastWeekStart.getDate() - DAYS_IN_WEEK);

    const hadAllocation = await hasActiveAllocationDuringWeek(
      this.allocationRepository,
      resourceId,
      lastWeekStart,
    );
    if (!hadAllocation) {
      return {
        hasMissedLastWeek: false,
        missedWeekStartDate: null,
        timesheetAccessFrozen: profile?.timesheetAccessFrozen ?? false,
      };
    }

    const submitted = await this.timesheetRepository.findByResourceAndWeek(resourceId, lastWeekStart);
    return {
      hasMissedLastWeek: submitted === null,
      missedWeekStartDate: submitted === null ? formatDate(lastWeekStart) : null,
      timesheetAccessFrozen: profile?.timesheetAccessFrozen ?? false,
    };
  }

  private assertNotFutureWeek(weekStartDate: Date): void {
    if (isFutureDate(weekStartDate)) {
      throw AppError.badRequest('Cannot submit a timesheet for a future week.');
    }
  }

  private async assertNoDuplicateSubmission(resourceId: number, weekStartDate: Date): Promise<void> {
    const existing = await this.timesheetRepository.findByResourceAndWeek(resourceId, weekStartDate);
    if (existing) {
      throw AppError.conflict('A timesheet for this week has already been submitted.');
    }
  }

  private assertTotalHoursWithinLimit(totalHours: number, maxWeeklyHours: number): void {
    if (totalHours > maxWeeklyHours) {
      throw AppError.badRequest(
        `Total hours (${totalHours}) exceed the maximum allowed (${maxWeeklyHours} hrs/week).`,
      );
    }
  }

  private isCurrentWeek(weekStartDate: Date): boolean {
    const currentWeekStart = getWeekStartDate(new Date());
    return formatDate(weekStartDate) === formatDate(currentWeekStart);
  }

  private async getAllocationsForWeek(resourceId: number, weekStart: Date) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + DAYS_IN_WEEK - 1);
    const allActive = await this.allocationRepository.findActiveByResource(resourceId);
    return allActive.filter((a) => a.fromDate <= weekEnd && a.toDate >= weekStart);
  }
}
