import { SchedulerService } from '../../../../server/src/services/SchedulerService';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { EmployeeRepository } from '../../../../server/src/repositories/EmployeeRepository';
import { MilestoneRepository } from '../../../../server/src/repositories/MilestoneRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { createMockRepo, makeEmployee, makeSystemConfig } from '../../helpers/repositoryMocks';
import { EmployeeStatus, HealthStatus } from '../../../../server/src/types/enums';

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

describe('SchedulerService', () => {
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let employeeRepo: jest.Mocked<EmployeeRepository>;
  let milestoneRepo: jest.Mocked<MilestoneRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let scheduler: SchedulerService;

  beforeEach(() => {
    allocationRepo = createMockRepo<AllocationRepository>();
    employeeRepo = createMockRepo<EmployeeRepository>();
    milestoneRepo = createMockRepo<MilestoneRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    configRepo.getConfig.mockResolvedValue(makeSystemConfig());
    scheduler = new SchedulerService(
      allocationRepo,
      employeeRepo,
      milestoneRepo,
      projectRepo,
      configRepo,
    );
  });

  describe('runAllChecks', () => {
    it('recomputes employee utilisation and status', async () => {
      employeeRepo.findAllActive.mockResolvedValue([
        makeEmployee({ id: 1, totalUtilisation: 0 }),
      ]);
      allocationRepo.findActiveByEmployee.mockResolvedValue([
        { utilisationPercent: 60 } as never,
      ]);
      projectRepo.findAll.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(employeeRepo.updateStatus).toHaveBeenCalledWith(1, EmployeeStatus.ALLOCATED, 60);
    });

    it('flags overdue milestones', async () => {
      employeeRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([{ id: 5 } as never]);
      projectRepo.findAll.mockResolvedValue([]);

      await scheduler.runAllChecks();

      expect(milestoneRepo.flagOverdue).toHaveBeenCalledWith(5);
    });

    it('sets project health to AT_RISK when milestone overdue', async () => {
      employeeRepo.findAllActive.mockResolvedValue([]);
      milestoneRepo.findIncompletePastDue.mockResolvedValue([]);
      projectRepo.findAll.mockResolvedValue([{ id: 1 } as never]);
      milestoneRepo.findByProjectId.mockResolvedValue([
        { status: 'IN_PROGRESS', healthFlag: 'OVERDUE', dueDate: new Date() } as never,
      ]);

      await scheduler.runAllChecks();

      expect(projectRepo.updateHealthStatus).toHaveBeenCalledWith(1, HealthStatus.AT_RISK);
    });
  });
});
