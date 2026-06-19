import { TimesheetService } from '../../../../server/src/services/TimesheetService';
import { TimesheetRepository } from '../../../../server/src/repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../../../../server/src/repositories/TimesheetEntryRepository';
import { ActivityTagRepository } from '../../../../server/src/repositories/ActivityTagRepository';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import {
  createMockRepo,
  makeResourceProfile,
  makeAllocation,
  makeSystemConfig,
} from '../../helpers/repositoryMocks';
import { getWeekStartDate } from '../../../../server/src/utils/dateUtils';

describe('TimesheetService', () => {
  let timesheetRepo: jest.Mocked<TimesheetRepository>;
  let entryRepo: jest.Mocked<TimesheetEntryRepository>;
  let tagRepo: jest.Mocked<ActivityTagRepository>;
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let service: TimesheetService;

  beforeEach(() => {
    timesheetRepo = createMockRepo<TimesheetRepository>();
    entryRepo = createMockRepo<TimesheetEntryRepository>();
    tagRepo = createMockRepo<ActivityTagRepository>();
    allocationRepo = createMockRepo<AllocationRepository>();
    resourceRepo = createMockRepo<ResourceRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    service = new TimesheetService(
      timesheetRepo,
      entryRepo,
      tagRepo,
      allocationRepo,
      resourceRepo,
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
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, utilisationPercent: 50, fromDate: lastWeek, toDate: lastWeek }),
      ]);
      timesheetRepo.save.mockResolvedValue({ id: 10, resourceId: 1, weekStartDate: lastWeek } as never);
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
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue({ id: 1 } as never);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 8, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects hours exceeding weekly limit', async () => {
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 50, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Total hours') });
    });

    it('rejects entry for unallocated project', async () => {
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByResource.mockResolvedValue([]);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 99, hours: 8, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects hours exceeding project allocation cap', async () => {
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, utilisationPercent: 25, fromDate: lastWeek, toDate: lastWeek }),
      ]);
      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 15, activityTags: ['Dev'] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('allocated max') });
    });

    it('rejects submission when timesheet access is frozen', async () => {
      resourceRepo.findProfileById.mockResolvedValue(
        makeResourceProfile({ timesheetAccessFrozen: true }),
      );

      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 8, activityTags: ['Dev'] }],
        }),
      ).rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('frozen') });
    });
  });

  describe('hasMissedCurrentWeek', () => {
    it('returns false when no allocation last week', async () => {
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(0);
      const result = await service.hasMissedCurrentWeek(1);
      expect(result.hasMissedLastWeek).toBe(false);
    });

    it('returns true when allocated but not submitted', async () => {
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(50);
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      const result = await service.hasMissedCurrentWeek(1);
      expect(result.hasMissedLastWeek).toBe(true);
      expect(result.missedWeekStartDate).not.toBeNull();
    });
  });

  describe('getMyTimesheets', () => {
    it('returns submitted and missed weeks', async () => {
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceId.mockResolvedValue([]);
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(50);

      const rows = await service.getMyTimesheets(1);
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('getSubmitContext', () => {
    it('returns allocation caps for the week', async () => {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - 7);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile({ fullName: 'Jane' }));
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, utilisationPercent: 50, fromDate: weekStart, toDate: weekStart }),
      ]);
      projectRepo.findById.mockResolvedValue({ id: 1, name: 'Alpha' } as never);

      const context = await service.getSubmitContext(1, weekStart);

      expect(context.employeeName).toBe('Jane');
      expect(context.allocations[0].maxHours).toBe(20);
    });
  });

  describe('getEmployeeWeekDetail', () => {
    it('returns submitted entries when timesheet exists', async () => {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - 7);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile({ fullName: 'Jane' }));
      timesheetRepo.findByResourceAndWeek.mockResolvedValue({
        id: 3,
        resourceId: 1,
        weekStartDate: weekStart,
        status: 'SUBMITTED',
      } as never);
      entryRepo.findByTimesheetId.mockResolvedValue([
        { id: 10, timesheetId: 3, projectId: 1, hours: 8 } as never,
      ]);
      projectRepo.findById.mockResolvedValue({ id: 1, name: 'Alpha' } as never);
      tagRepo.findByTimesheetEntryId.mockResolvedValue([{ id: 1, timesheetEntryId: 10, tagName: 'Dev' }]);
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, fromDate: weekStart, toDate: weekStart }),
      ]);

      const detail = await service.getEmployeeWeekDetail(1, weekStart);

      expect(detail.status).toBe('SUBMITTED');
      expect(detail.entries[0].projectName).toBe('Alpha');
      expect(detail.totalHours).toBe(8);
    });

    it('returns missed entries when timesheet status is MISSED', async () => {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - 7);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue({
        id: 4,
        resourceId: 1,
        weekStartDate: weekStart,
        status: 'MISSED',
      } as never);
      allocationRepo.findActiveByResource.mockResolvedValue([]);

      const detail = await service.getEmployeeWeekDetail(1, weekStart);

      expect(detail.status).toBe('MISSED');
      expect(detail.entries).toHaveLength(0);
    });

    it('returns missed status for completed week without submission', async () => {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - 7);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, fromDate: weekStart, toDate: weekStart }),
      ]);

      const detail = await service.getEmployeeWeekDetail(1, weekStart);

      expect(detail.status).toBe('MISSED');
      expect(detail.entries).toHaveLength(0);
    });
  });

  describe('getTeamTimesheets', () => {
    it('returns submitted and missed rows for manager team', async () => {
      const weekStart = getWeekStartDate(new Date());
      weekStart.setDate(weekStart.getDate() - 7);
      resourceRepo.findByManagerId.mockResolvedValue([makeResourceProfile({ id: 1, fullName: 'Jane' })]);
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, fromDate: weekStart, toDate: weekStart }),
        makeAllocation({ projectId: 2, fromDate: weekStart, toDate: weekStart }),
      ]);
      timesheetRepo.findByResourceAndWeek.mockResolvedValue({
        id: 5,
        resourceId: 1,
        weekStartDate: weekStart,
        status: 'SUBMITTED',
      } as never);
      entryRepo.findByTimesheetId.mockResolvedValue([
        { id: 1, timesheetId: 5, projectId: 1, hours: 10 } as never,
      ]);
      projectRepo.findById
        .mockResolvedValueOnce({ id: 1, name: 'Alpha' } as never)
        .mockResolvedValueOnce({ id: 2, name: 'Beta' } as never);

      const rows = await service.getTeamTimesheets(10, weekStart);

      expect(rows.some((r) => r.status === 'SUBMITTED' && r.hours === 10)).toBe(true);
      expect(rows.some((r) => r.status === 'MISSED')).toBe(true);
    });
  });

  describe('validation branches', () => {
    const lastWeek = getWeekStartDate(new Date());
    lastWeek.setDate(lastWeek.getDate() - 7);
    const formatWeek = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}-${mm}-${d.getFullYear()}`;
    };

    it('rejects future week submission', async () => {
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      const futureWeek = getWeekStartDate(new Date());
      futureWeek.setDate(futureWeek.getDate() + 14);

      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(futureWeek),
          entries: [],
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('future week') });
    });

    it('requires activity tags when logging hours', async () => {
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile());
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ projectId: 1, utilisationPercent: 50, fromDate: lastWeek, toDate: lastWeek }),
      ]);

      await expect(
        service.submitTimesheet(1, {
          weekStartDate: formatWeek(lastWeek),
          entries: [{ projectId: 1, hours: 5, activityTags: [] }],
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Activity tags') });
    });
  });
});
