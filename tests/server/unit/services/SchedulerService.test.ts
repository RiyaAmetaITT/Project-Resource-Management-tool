import { SchedulerService } from '../../../../server/src/services/SchedulerService';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { MilestoneRepository } from '../../../../server/src/repositories/MilestoneRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { TimesheetRepository } from '../../../../server/src/repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../../../../server/src/repositories/TimesheetEntryRepository';
import { TimesheetNotificationService } from '../../../../server/src/services/TimesheetNotificationService';
import { ProjectHealthNotificationService } from '../../../../server/src/services/ProjectHealthNotificationService';
import {
  createMockRepo,
  makeResourceProfile,
  makeSystemConfig,
  makeProject,
} from '../../helpers/repositoryMocks';
import { ResourceStatus, HealthStatus, HealthFlag, MilestoneStatus } from '../../../../server/src/types/enums';

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

describe('SchedulerService', () => {
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let milestoneRepo: jest.Mocked<MilestoneRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let timesheetRepo: jest.Mocked<TimesheetRepository>;
  let entryRepo: jest.Mocked<TimesheetEntryRepository>;
  let notificationService: jest.Mocked<TimesheetNotificationService>;
  let projectHealthNotificationService: jest.Mocked<ProjectHealthNotificationService>;
  let scheduler: SchedulerService;

  beforeEach(() => {
    allocationRepo = createMockRepo<AllocationRepository>();
    resourceRepo = createMockRepo<ResourceRepository>();
    milestoneRepo = createMockRepo<MilestoneRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    timesheetRepo = createMockRepo<TimesheetRepository>();
    entryRepo = createMockRepo<TimesheetEntryRepository>();
    notificationService = createMockRepo<TimesheetNotificationService>();
    projectHealthNotificationService = createMockRepo<ProjectHealthNotificationService>();
    notificationService.processNotifications.mockResolvedValue(undefined);
    projectHealthNotificationService.notifyAtRisk.mockResolvedValue(undefined);
    configRepo.getConfig.mockResolvedValue(makeSystemConfig());
    scheduler = new SchedulerService(
      allocationRepo,
      resourceRepo,
      milestoneRepo,
      projectRepo,
      configRepo,
      timesheetRepo,
      entryRepo,
      notificationService,
      projectHealthNotificationService,
    );
  });

  describe('start and stop', () => {
    it('schedules cron and runs initial checks', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([]);

      await scheduler.start();
      scheduler.stop();

      expect(resourceRepo.findAllActive).toHaveBeenCalled();
    });
  });

  describe('runAllChecks', () => {
    it('recomputes resource utilisation and status', async () => {
      resourceRepo.findAllActive.mockResolvedValue([
        makeResourceProfile({ id: 1, totalUtilisation: 0 }),
      ]);
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(60);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(allocationRepo.sumUtilisationInPeriod).toHaveBeenCalled();
      expect(resourceRepo.updateStatus).toHaveBeenCalledWith(1, ResourceStatus.ALLOCATED, 60);
    });

    it('sets bench status when utilisation is zero', async () => {
      resourceRepo.findAllActive.mockResolvedValue([makeResourceProfile({ id: 2 })]);
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(0);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(resourceRepo.updateStatus).toHaveBeenCalledWith(2, ResourceStatus.BENCH, 0);
    });

    it('flags missed timesheets for completed weeks with allocations', async () => {
      resourceRepo.findAllActive.mockResolvedValue([makeResourceProfile({ id: 1 })]);
      allocationRepo.sumUtilisationInPeriod
        .mockResolvedValueOnce(50)
        .mockResolvedValue(50);
      timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(timesheetRepo.saveMissed).toHaveBeenCalled();
    });

    it('flags overdue milestones', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([{ id: 5 } as never]);
      projectRepo.findAll.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(milestoneRepo.flagOverdue).toHaveBeenCalledWith(5);
    });

    it('sets project health to AT_RISK when milestone is overdue', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([makeProject({ id: 1 })]);
      milestoneRepo.findByProjectId.mockResolvedValue([
        {
          status: MilestoneStatus.IN_PROGRESS,
          healthFlag: HealthFlag.OVERDUE,
          dueDate: new Date(),
          storyPoints: 10,
        } as never,
      ]);
      allocationRepo.findActiveByProject.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(projectRepo.updateHealthStatus).toHaveBeenCalledWith(1, HealthStatus.AT_RISK);
    });

    it('sets project health to ATTENTION when milestone is approaching', async () => {
      const dueSoon = new Date();
      dueSoon.setDate(dueSoon.getDate() + 3);

      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([makeProject({ id: 2, totalStoryPoints: 0 })]);
      milestoneRepo.findByProjectId.mockResolvedValue([
        {
          status: MilestoneStatus.IN_PROGRESS,
          healthFlag: HealthFlag.NORMAL,
          dueDate: dueSoon,
          storyPoints: 0,
        } as never,
      ]);
      allocationRepo.findActiveByProject.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(projectRepo.updateHealthStatus).toHaveBeenCalledWith(2, HealthStatus.ATTENTION);
    });

    it('sets project health to ON_TRACK when no risks are detected', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([makeProject({ id: 3, totalStoryPoints: 0 })]);
      milestoneRepo.findByProjectId.mockResolvedValue([]);
      allocationRepo.findActiveByProject.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(projectRepo.updateHealthStatus).toHaveBeenCalledWith(3, HealthStatus.ON_TRACK);
    });

    it('sets project health to AT_RISK when logged hours are critically low', async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([makeProject({ id: 4, totalStoryPoints: 0 })]);
      milestoneRepo.findByProjectId.mockResolvedValue([]);
      allocationRepo.findActiveByProject.mockResolvedValue([
        { resourceId: 1, utilisationPercent: 100 } as never,
      ]);
      timesheetRepo.findByResourceAndWeek.mockResolvedValue({
        id: 9,
        resourceId: 1,
        weekStartDate: weekStart,
        status: 'SUBMITTED',
      } as never);
      entryRepo.findByTimesheetId.mockResolvedValue([
        { id: 1, timesheetId: 9, projectId: 4, hours: 1 } as never,
      ]);

      await scheduler.runAllChecks();

      expect(projectRepo.updateHealthStatus).toHaveBeenCalledWith(4, HealthStatus.AT_RISK);
    });

    it('notifies the manager when a project becomes AT_RISK for the first time', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([
        makeProject({ id: 7, atRiskNotifiedAt: null }),
      ]);
      milestoneRepo.findByProjectId.mockResolvedValue([
        {
          status: MilestoneStatus.IN_PROGRESS,
          healthFlag: HealthFlag.OVERDUE,
          dueDate: new Date(),
          storyPoints: 10,
        } as never,
      ]);
      allocationRepo.findActiveByProject.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(projectHealthNotificationService.notifyAtRisk).toHaveBeenCalledWith(7, HealthStatus.AT_RISK);
      expect(projectRepo.markAtRiskNotified).toHaveBeenCalledWith(7);
    });

    it('does not re-notify when project is already AT_RISK and was notified', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([
        makeProject({
          id: 8,
          healthStatus: HealthStatus.AT_RISK,
          atRiskNotifiedAt: new Date('2026-06-01'),
        }),
      ]);
      milestoneRepo.findByProjectId.mockResolvedValue([
        {
          status: MilestoneStatus.IN_PROGRESS,
          healthFlag: HealthFlag.OVERDUE,
          dueDate: new Date(),
          storyPoints: 10,
        } as never,
      ]);
      allocationRepo.findActiveByProject.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(projectHealthNotificationService.notifyAtRisk).not.toHaveBeenCalled();
    });

    it('clears at-risk notification flag when project health improves', async () => {
      resourceRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([
        makeProject({
          id: 9,
          healthStatus: HealthStatus.AT_RISK,
          atRiskNotifiedAt: new Date('2026-06-01'),
          totalStoryPoints: 0,
        }),
      ]);
      milestoneRepo.findByProjectId.mockResolvedValue([]);
      allocationRepo.findActiveByProject.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(projectRepo.updateHealthStatus).toHaveBeenCalledWith(9, HealthStatus.ON_TRACK);
      expect(projectRepo.clearAtRiskNotification).toHaveBeenCalledWith(9);
    });
  });
});
