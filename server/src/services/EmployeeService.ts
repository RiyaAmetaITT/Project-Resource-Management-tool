import { TimesheetService } from './TimesheetService';
import { AllocationService } from './AllocationService';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { SubmitTimesheetDto, TimesheetResponseDto, SubmitTimesheetContextDto, MissedTimesheetCheckDto, EmployeeWeekTimesheetDetailDto } from '../dtos/timesheet.dto';
import { AllocationResponseDto } from '../dtos/allocation.dto';
import { AppError } from '../errors/AppError';

export class EmployeeService {
  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly allocationService: AllocationService,
    private readonly resourceRepository: ResourceRepository,
  ) {}

  async submitTimesheet(userId: number, dto: SubmitTimesheetDto): Promise<void> {
    const resourceId = await this.getResourceIdForUser(userId);
    await this.timesheetService.submitTimesheet(resourceId, dto);
  }

  async getMyTimesheets(userId: number): Promise<TimesheetResponseDto[]> {
    const resourceId = await this.getResourceIdForUser(userId);
    return this.timesheetService.getMyTimesheets(resourceId);
  }

  async getTimesheetWeekDetail(userId: number, weekStartDate: Date): Promise<EmployeeWeekTimesheetDetailDto> {
    const resourceId = await this.getResourceIdForUser(userId);
    return this.timesheetService.getEmployeeWeekDetail(resourceId, weekStartDate);
  }

  async getSubmitContext(userId: number, weekStartDate: Date): Promise<SubmitTimesheetContextDto> {
    const resourceId = await this.getResourceIdForUser(userId);
    return this.timesheetService.getSubmitContext(resourceId, weekStartDate);
  }

  async checkMissedTimesheet(userId: number): Promise<MissedTimesheetCheckDto> {
    const resourceId = await this.getResourceIdForUser(userId);
    return this.timesheetService.hasMissedCurrentWeek(resourceId);
  }

  async getMyAllocations(userId: number): Promise<AllocationResponseDto[]> {
    const resourceId = await this.getResourceIdForUser(userId);
    return this.allocationService.getActiveAllocationsForEmployee(resourceId);
  }

  private async getResourceIdForUser(userId: number): Promise<number> {
    const resource = await this.resourceRepository.findByUserId(userId);
    if (!resource) {
      throw AppError.notFound('Employee profile not found for this user.');
    }
    return resource.id;
  }
}
