import { AllocationService } from '../../../../server/src/services/AllocationService';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { EmployeeRepository } from '../../../../server/src/repositories/EmployeeRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { createMockRepo, makeEmployee, makeProject, makeAllocation } from '../../helpers/repositoryMocks';
import { EmployeeStatus, ProjectStatus } from '../../../../server/src/types/enums';

describe('AllocationService', () => {
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let employeeRepo: jest.Mocked<EmployeeRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let service: AllocationService;

  beforeEach(() => {
    allocationRepo = createMockRepo<AllocationRepository>();
    employeeRepo = createMockRepo<EmployeeRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    service = new AllocationService(allocationRepo, employeeRepo, projectRepo);
  });

  describe('allocateResource', () => {
    const dto = {
      employeeId: 1,
      projectId: 1,
      utilisationPercent: 50,
      fromDate: '01-01-2025',
      toDate: '31-12-2025',
    };

    it('creates allocation when within utilisation limit', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 1 }));
      projectRepo.findById.mockResolvedValue(makeProject({ id: 1 }));
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(30);
      allocationRepo.save.mockResolvedValue(makeAllocation({ utilisationPercent: 50 }));

      const result = await service.allocateResource(dto);

      expect(result.utilisationPercent).toBe(50);
      expect(allocationRepo.save).toHaveBeenCalled();
      expect(employeeRepo.updateStatus).toHaveBeenCalledWith(1, EmployeeStatus.ALLOCATED, 30);
    });

    it('rejects over-allocation', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      projectRepo.findById.mockResolvedValue(makeProject());
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(80);

      await expect(service.allocateResource({ ...dto, utilisationPercent: 30 })).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Over-allocation'),
      });
    });

    it('rejects inactive employee', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ isActive: false }));
      await expect(service.allocateResource(dto)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects ON_HOLD project', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      projectRepo.findById.mockResolvedValue(makeProject({ status: ProjectStatus.ON_HOLD }));
      await expect(service.allocateResource(dto)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('ON_HOLD'),
      });
    });

    it('rejects from date >= to date', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      projectRepo.findById.mockResolvedValue(makeProject());
      await expect(
        service.allocateResource({ ...dto, fromDate: '31-12-2025', toDate: '01-01-2025' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('endAllocation', () => {
    it('ends allocation and updates employee status', async () => {
      allocationRepo.findById.mockResolvedValue(makeAllocation({ employeeId: 1 }));
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(0);

      await service.endAllocation(1);

      expect(allocationRepo.endAllocation).toHaveBeenCalledWith(1, expect.any(Date));
      expect(employeeRepo.updateStatus).toHaveBeenCalledWith(1, EmployeeStatus.BENCH, 0);
    });

    it('throws when allocation not found', async () => {
      allocationRepo.findById.mockResolvedValue(null);
      await expect(service.endAllocation(99)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('assertEmployeeInManagerTeam', () => {
    it('passes when employee belongs to manager', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ managerId: 10 }));
      await expect(service.assertEmployeeInManagerTeam(1, 10)).resolves.toBeUndefined();
    });

    it('throws forbidden when employee not in team', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ managerId: 99 }));
      await expect(service.assertEmployeeInManagerTeam(1, 10)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('assertManagerOwnsProject', () => {
    it('passes when manager owns project', async () => {
      projectRepo.findById.mockResolvedValue(makeProject({ managerId: 10 }));
      await expect(service.assertManagerOwnsProject(1, 10)).resolves.toBeUndefined();
    });

    it('throws forbidden when manager does not own project', async () => {
      projectRepo.findById.mockResolvedValue(makeProject({ managerId: 99 }));
      await expect(service.assertManagerOwnsProject(1, 10)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
