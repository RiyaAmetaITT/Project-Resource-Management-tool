import { TimesheetService } from '../../../../server/src/services/TimesheetService';
import { TimesheetRepository } from '../../../../server/src/repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../../../../server/src/repositories/TimesheetEntryRepository';
import { ActivityTagRepository } from '../../../../server/src/repositories/ActivityTagRepository';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { EmployeeRepository } from '../../../../server/src/repositories/EmployeeRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { createMockRepo, makeEmployee, makeAllocation, makeSystemConfig } from '../../helpers/repositoryMocks';
import { getWeekStartDate } from '../../../../server/src/utils/dateUtils';

describe('TimesheetService', () => {
  let timesheetRepo: jest.Mocked<TimesheetRepository>;
  let entryRepo: jest.Mocked<TimesheetEntryRepository>;
  let tagRepo: jest.Mocked<ActivityTagRepository>;
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let employeeRepo: jest.Mocked<EmployeeRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let service: TimesheetService;

  beforeEach(() => {
    timesheetRepo = createMockRepo<TimesheetRepository>();
    entryRepo = createMockRepo<TimesheetEntryRepository>();
    tagRepo = createMockRepo<ActivityTagRepository>();
    allocationRepo = createMockRepo<AllocationRepository>();
    employeeRepo = createMockRepo<EmployeeRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    service = new TimesheetService(
      timesheetRepo,
      entryRepo,
      tagRepo,
      allocationRepo,
      employeeRepo,
      projectRepo,
      configRepo,
    );
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ maxWeeklyHours: 40 }));
  });

  describe('submitTimesheet', () => {
    const lastWeek = getWeekStartDate(new Date());
    lastWeek.setDate(lastWeek.getDate() - 7);

    const formatWeek = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}-${mm}-${d.getFullYear()}`;
    };

    it('saves timesheet with entries and tags', async () => {
      timesheetRepo.findByEmployeeAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByEmployee.mockResolvedValue([
        makeAllocation({ projectId: 1, utilisationPercent: 50 }),
      ]);
      timesheetRepo.save.mockResolvedValue({ id: 10, employeeId: 1, weekStartDate: lastWeek } as never);
      entryRepo.save.mockResolvedValue({ id: 20, timesheetId: 10, projectId: 1, hours: 20 } as never);

      await service.submitTimesheet(1, {
        weekStartDate: formatWeek(lastWeek),
        entries: [{ projectId: 1, hours: 20, activityTags: ['Bug Fixing'] }],
      });

      expect(timesheetRepo.save).toHaveBeenCalled();
      expect(entryRepo.save).toHaveBeenCalled();
      expect(tagRepo.save).toHaveBeenCalledWith({ timesheetEntryId: 20, tagName: 'Bug Fixing' });
    });

    it('rejects duplicate submission', async () => {
      timesheetRepo.findByEmployeeAndWeek.mockResolvedValue({ id: 1 } as never);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 8, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects hours exceeding weekly limit', async () => {
      timesheetRepo.findByEmployeeAndWeek.mockResolvedValue(null);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 50, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Total hours') });
    });

    it('rejects entry for unallocated project', async () => {
      timesheetRepo.findByEmployeeAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByEmployee.mockResolvedValue([]);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 99, hours: 8, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects hours exceeding project allocation cap', async () => {
      timesheetRepo.findByEmployeeAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByEmployee.mockResolvedValue([
        makeAllocation({ projectId: 1, utilisationPercent: 25 }),
      ]);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 15, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('allocated max') });
    });
  });

  describe('hasMissedCurrentWeek', () => {
    it('returns false when no allocation last week', async () => {
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(0);
      const result = await service.hasMissedCurrentWeek(1);
      expect(result.hasMissed).toBe(false);
    });

    it('returns true when allocated but not submitted', async () => {
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(50);
      timesheetRepo.findByEmployeeAndWeek.mockResolvedValue(null);
      const result = await service.hasMissedCurrentWeek(1);
      expect(result.hasMissed).toBe(true);
      expect(result.weekStartDate).not.toBeNull();
    });
  });

  describe('getMyTimesheets', () => {
    it('returns submitted and missed weeks', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      timesheetRepo.findByEmployeeId.mockResolvedValue([]);
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(50);

      const rows = await service.getMyTimesheets(1);
      expect(Array.isArray(rows)).toBe(true);
    });
  });
});
