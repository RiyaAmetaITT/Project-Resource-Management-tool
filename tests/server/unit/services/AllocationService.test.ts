import { AllocationService } from '../../../../server/src/services/AllocationService';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import {
  createMockRepo,
  makeResourceProfile,
  makeProject,
  makeAllocation,
} from '../../helpers/repositoryMocks';
import { ResourceStatus, ProjectStatus } from '../../../../server/src/types/enums';

describe('AllocationService', () => {
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let service: AllocationService;

  beforeEach(() => {
    allocationRepo = createMockRepo<AllocationRepository>();
    resourceRepo = createMockRepo<ResourceRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    service = new AllocationService(allocationRepo, resourceRepo, projectRepo);
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
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 1 }));
      projectRepo.findById.mockResolvedValue(makeProject({ id: 1 }));
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(30);
      allocationRepo.save.mockResolvedValue(makeAllocation({ utilisationPercent: 50 }));
      allocationRepo.sumUtilisationInPeriod.mockResolvedValueOnce(30).mockResolvedValueOnce(80);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile({ id: 1 }));

      const result = await service.allocateResource(dto);

      expect(result.utilisationPercent).toBe(50);
      expect(allocationRepo.save).toHaveBeenCalled();
      expect(resourceRepo.updateStatus).toHaveBeenCalledWith(1, ResourceStatus.ALLOCATED, 80);
    });

    it('rejects over-allocation', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile());
      projectRepo.findById.mockResolvedValue(makeProject());
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(80);

      await expect(service.allocateResource({ ...dto, utilisationPercent: 30 })).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Over-allocation'),
      });
    });

    it('rejects inactive employee', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(null);
      await expect(service.allocateResource(dto)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects ON_HOLD project', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile());
      projectRepo.findById.mockResolvedValue(makeProject({ status: ProjectStatus.ON_HOLD }));
      await expect(service.allocateResource(dto)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('ON_HOLD'),
      });
    });

    it('rejects COMPLETED project', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile());
      projectRepo.findById.mockResolvedValue(makeProject({ status: ProjectStatus.COMPLETED }));
      await expect(service.allocateResource(dto)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('COMPLETED'),
      });
    });

    it('rejects from date >= to date', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile());
      projectRepo.findById.mockResolvedValue(makeProject());
      await expect(
        service.allocateResource({ ...dto, fromDate: '31-12-2025', toDate: '01-01-2025' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('validateAllocation', () => {
    it('returns validation summary when within limit', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 1 }));
      projectRepo.findById.mockResolvedValue(makeProject());
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(20);

      const result = await service.validateAllocation({
        employeeId: 1,
        projectId: 1,
        utilisationPercent: 30,
        fromDate: '01-01-2025',
        toDate: '31-12-2025',
      });

      expect(result.isValid).toBe(true);
      expect(result.newTotal).toBe(50);
    });
  });

  describe('endAllocation', () => {
    it('ends allocation and updates resource status', async () => {
      allocationRepo.findById.mockResolvedValue(makeAllocation({ resourceId: 1 }));
      allocationRepo.sumUtilisationInPeriod.mockResolvedValue(0);

      await service.endAllocation(1);

      expect(allocationRepo.endAllocation).toHaveBeenCalledWith(1, expect.any(Date));
      expect(resourceRepo.updateStatus).toHaveBeenCalledWith(1, ResourceStatus.BENCH, 0);
    });

    it('throws when allocation not found', async () => {
      allocationRepo.findById.mockResolvedValue(null);
      await expect(service.endAllocation(99)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('assertEmployeeInManagerTeam', () => {
    it('passes when employee belongs to manager', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile({ managerId: 10 }));
      await expect(service.assertEmployeeInManagerTeam(1, 10)).resolves.toBeUndefined();
    });

    it('throws forbidden when employee not in team', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(makeResourceProfile({ managerId: 99 }));
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

  describe('getAllAllocations', () => {
    it('returns enriched allocations', async () => {
      allocationRepo.findAll.mockResolvedValue([makeAllocation({ id: 2, resourceId: 1, projectId: 3 })]);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile({ fullName: 'Jane' }));
      projectRepo.findById.mockResolvedValue(makeProject({ id: 3, name: 'Beta' }));

      const rows = await service.getAllAllocations();

      expect(rows[0].projectName).toBe('Beta');
    });
  });

  describe('getActiveAllocationsForEmployee', () => {
    it('enriches allocations with employee and project names', async () => {
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ id: 5, resourceId: 1, projectId: 2 }),
      ]);
      resourceRepo.findProfileById.mockResolvedValue(makeResourceProfile({ id: 1, fullName: 'Jane' }));
      projectRepo.findById.mockResolvedValue(makeProject({ id: 2, name: 'Alpha' }));

      const rows = await service.getActiveAllocationsForEmployee(1);

      expect(rows).toHaveLength(1);
      expect(rows[0].employeeName).toBe('Jane');
      expect(rows[0].projectName).toBe('Alpha');
    });
  });
});
