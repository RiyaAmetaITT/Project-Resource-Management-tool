import { EmployeeService } from '../../../../server/src/services/EmployeeService';
import { TimesheetService } from '../../../../server/src/services/TimesheetService';
import { AllocationService } from '../../../../server/src/services/AllocationService';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { createMockRepo, makeResourceProfile } from '../../helpers/repositoryMocks';
import { AppError } from '../../../../server/src/errors/AppError';
import { getWeekStartDate } from '../../../../server/src/utils/dateUtils';

describe('EmployeeService', () => {
  let timesheetService: jest.Mocked<TimesheetService>;
  let allocationService: jest.Mocked<AllocationService>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let service: EmployeeService;

  beforeEach(() => {
    timesheetService = createMockRepo<TimesheetService>();
    allocationService = createMockRepo<AllocationService>();
    resourceRepo = createMockRepo<ResourceRepository>();
    service = new EmployeeService(timesheetService, allocationService, resourceRepo);
  });

  it('submitTimesheet resolves resource and delegates', async () => {
    resourceRepo.findByUserId.mockResolvedValue(makeResourceProfile({ id: 7, userId: 3 }));
    const dto = { weekStartDate: '01-06-2025', entries: [] };

    await service.submitTimesheet(3, dto);

    expect(timesheetService.submitTimesheet).toHaveBeenCalledWith(7, dto);
  });

  it('getMyAllocations delegates to allocation service', async () => {
    resourceRepo.findByUserId.mockResolvedValue(makeResourceProfile({ id: 4, userId: 2 }));
    allocationService.getActiveAllocationsForEmployee.mockResolvedValue([]);

    await service.getMyAllocations(2);

    expect(allocationService.getActiveAllocationsForEmployee).toHaveBeenCalledWith(4);
  });

  it('checkMissedTimesheet delegates to timesheet service', async () => {
    resourceRepo.findByUserId.mockResolvedValue(makeResourceProfile({ id: 5, userId: 1 }));
    timesheetService.hasMissedCurrentWeek.mockResolvedValue({
      hasMissedLastWeek: true,
      missedWeekStartDate: '02-06-2025',
    });

    const result = await service.checkMissedTimesheet(1);

    expect(timesheetService.hasMissedCurrentWeek).toHaveBeenCalledWith(5);
    expect(result.hasMissedLastWeek).toBe(true);
  });

  it('throws when user has no resource profile', async () => {
    resourceRepo.findByUserId.mockResolvedValue(null);

    await expect(service.getMyTimesheets(99)).rejects.toThrow(AppError);
    await expect(service.getMyTimesheets(99)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getTimesheetWeekDetail delegates with resolved resource id', async () => {
    const weekStart = getWeekStartDate(new Date());
    resourceRepo.findByUserId.mockResolvedValue(makeResourceProfile({ id: 8, userId: 6 }));
    timesheetService.getEmployeeWeekDetail.mockResolvedValue({
      employeeName: 'Jane',
      weekStartDate: '01-06-2025',
      status: 'SUBMITTED',
      entries: [],
      totalHours: 0,
    });

    await service.getTimesheetWeekDetail(6, weekStart);

    expect(timesheetService.getEmployeeWeekDetail).toHaveBeenCalledWith(8, weekStart);
  });
});
