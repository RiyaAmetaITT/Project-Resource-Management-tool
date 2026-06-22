import { AllocationResponseDto } from '../dtos/allocation.dto';
import { ProjectFacts } from '../services/ai/IAIService';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { TimesheetService } from '../services/TimesheetService';
import { getWeekStartDate } from './dateUtils';
import { DAYS_IN_WEEK, MAX_UTILISATION_PERCENT } from '../constants';

export async function buildRecentHoursSummary(
  timesheetService: TimesheetService,
  configRepository: SystemConfigRepository,
  projectId: number,
  allocations: AllocationResponseDto[],
): Promise<ProjectFacts['recentHoursSummary']> {
  const config = await configRepository.getConfig();
  const lastWeekStart = getWeekStartDate(new Date());
  lastWeekStart.setDate(lastWeekStart.getDate() - DAYS_IN_WEEK);

  return Promise.all(
    allocations.map(async (allocation) => {
      const detail = await timesheetService.getEmployeeWeekDetail(
        allocation.employeeId,
        lastWeekStart,
      );
      const projectEntry = detail.entries.find((e) => e.projectId === projectId);
      const expectedHours = Math.floor(
        (allocation.utilisationPercent / MAX_UTILISATION_PERCENT) * config.maxWeeklyHours,
      );
      return {
        employeeName: allocation.employeeName,
        loggedHours: projectEntry?.hours ?? 0,
        expectedHours,
      };
    }),
  );
}
