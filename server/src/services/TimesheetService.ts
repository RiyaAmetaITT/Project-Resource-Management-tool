import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { SubmitTimesheetDto, TimesheetResponseDto, TeamTimesheetRowDto } from '../dtos/timesheet.dto';
import { AppError } from '../errors/AppError';
import { parseDate, getWeekStartDate, isFutureDate, formatDate } from '../utils/dateUtils';

const MISSED_HISTORY_WEEKS = 12;

export class TimesheetService {
  constructor(
    private readonly timesheetRepository: TimesheetRepository,
    private readonly entryRepository: TimesheetEntryRepository,
    private readonly tagRepository: ActivityTagRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configRepository: SystemConfigRepository,
  ) {}

  async submitTimesheet(employeeId: number, dto: SubmitTimesheetDto): Promise<void> {
    const config = await this.configRepository.getConfig();
    const weekStartDate = parseDate(dto.weekStartDate);

    this.assertNotFutureWeek(weekStartDate);
    await this.assertNoDuplicateSubmission(employeeId, weekStartDate);

    const totalHours = dto.entries.reduce((sum, e) => sum + e.hours, 0);
    this.assertTotalHoursWithinLimit(totalHours, config.maxWeeklyHours);

    const activeAllocations = await this.allocationRepository.findActiveByEmployee(employeeId);

    for (const entry of dto.entries) {
      const allocation = activeAllocations.find((a) => a.projectId === entry.projectId);
      if (!allocation) {
        throw AppError.badRequest(
          `You are not allocated to project ${entry.projectId} during this week.`,
        );
      }
      const maxHoursForProject = Math.floor((allocation.utilisationPercent / 100) * config.maxWeeklyHours);
      if (entry.hours > maxHoursForProject) {
        throw AppError.badRequest(
          `Hours for project ${entry.projectId} exceed your allocated max of ${maxHoursForProject} hrs.`,
        );
      }
    }

    const timesheet = await this.timesheetRepository.save({ employeeId, weekStartDate });

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

  async getMyTimesheets(employeeId: number): Promise<TimesheetResponseDto[]> {
    const employee = await this.employeeRepository.findById(employeeId);
    const submitted = await this.timesheetRepository.findByEmployeeId(employeeId);
    const submittedByWeek = new Map(
      submitted.map((ts) => [formatDate(new Date(ts.weekStartDate)), ts]),
    );

    const rows: TimesheetResponseDto[] = [];

    for (let i = 0; i < MISSED_HISTORY_WEEKS; i++) {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - i * 7);

      if (isFutureDate(weekStart) || this.isCurrentWeek(weekStart)) continue;

      const hadAllocation = await this.hadActiveAllocationDuringWeek(employeeId, weekStart);
      if (!hadAllocation) continue;

      const existing = submittedByWeek.get(formatDate(weekStart));
      if (existing) {
        const entries = await this.entryRepository.findByTimesheetId(existing.id);
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        rows.push({
          id: existing.id,
          employeeId: existing.employeeId,
          employeeName: employee?.name ?? 'Unknown',
          weekStartDate: existing.weekStartDate,
          totalHours,
          status: 'SUBMITTED',
        });
      } else {
        rows.push({
          id: 0,
          employeeId,
          employeeName: employee?.name ?? 'Unknown',
          weekStartDate: weekStart,
          totalHours: 0,
          status: 'MISSED',
        });
      }
    }

    return rows.sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());
  }

  async getTeamTimesheets(managerId: number, weekStartDate: Date): Promise<TeamTimesheetRowDto[]> {
    const employees = await this.employeeRepository.findByManagerId(managerId);
    const rows: TeamTimesheetRowDto[] = [];
    const weekIsComplete = !this.isCurrentWeek(weekStartDate) && !isFutureDate(weekStartDate);

    for (const employee of employees) {
      const allocations = await this.getAllocationsForWeek(employee.id, weekStartDate);
      if (allocations.length === 0) continue;

      const timesheet = await this.timesheetRepository.findByEmployeeAndWeek(employee.id, weekStartDate);
      const entries = timesheet ? await this.entryRepository.findByTimesheetId(timesheet.id) : [];

      for (const allocation of allocations) {
        const project = await this.projectRepository.findById(allocation.projectId);
        const entry = entries.find((e) => e.projectId === allocation.projectId);

        if (entry) {
          rows.push({
            employeeId: employee.id,
            employeeName: employee.name,
            projectId: allocation.projectId,
            projectName: project?.name ?? 'Unknown',
            hours: entry.hours,
            status: 'SUBMITTED',
          });
        } else if (weekIsComplete) {
          rows.push({
            employeeId: employee.id,
            employeeName: employee.name,
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

  async hasMissedCurrentWeek(employeeId: number): Promise<{ hasMissed: boolean; weekStartDate: string | null }> {
    const lastWeekStart = getWeekStartDate(new Date());
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const hadAllocation = await this.hadActiveAllocationDuringWeek(employeeId, lastWeekStart);
    if (!hadAllocation) {
      return { hasMissed: false, weekStartDate: null };
    }

    const submitted = await this.timesheetRepository.findByEmployeeAndWeek(employeeId, lastWeekStart);
    return {
      hasMissed: submitted === null,
      weekStartDate: submitted === null ? formatDate(lastWeekStart) : null,
    };
  }

  // ── Private validation helpers ─────────────────────────────────────────────

  private assertNotFutureWeek(weekStartDate: Date): void {
    if (isFutureDate(weekStartDate)) {
      throw AppError.badRequest('Cannot submit a timesheet for a future week.');
    }
  }

  private async assertNoDuplicateSubmission(employeeId: number, weekStartDate: Date): Promise<void> {
    const existing = await this.timesheetRepository.findByEmployeeAndWeek(employeeId, weekStartDate);
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

  private async hadActiveAllocationDuringWeek(employeeId: number, weekStart: Date): Promise<boolean> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const utilisation = await this.allocationRepository.sumUtilisationInPeriod(employeeId, weekStart, weekEnd);
    return utilisation > 0;
  }

  private async getAllocationsForWeek(employeeId: number, weekStart: Date) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const allActive = await this.allocationRepository.findActiveByEmployee(employeeId);
    return allActive.filter((a) => a.fromDate <= weekEnd && a.toDate >= weekStart);
  }
}
