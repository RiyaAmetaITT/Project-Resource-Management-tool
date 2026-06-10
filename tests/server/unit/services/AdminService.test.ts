import { AdminService } from '../../../../server/src/services/AdminService';
import { UserRepository } from '../../../../server/src/repositories/UserRepository';
import { EmployeeRepository } from '../../../../server/src/repositories/EmployeeRepository';
import { EmployeeSkillRepository } from '../../../../server/src/repositories/EmployeeSkillRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { MilestoneRepository } from '../../../../server/src/repositories/MilestoneRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { AuthService } from '../../../../server/src/services/AuthService';
import {
  createMockRepo,
  makeUser,
  makeEmployee,
  makeProject,
  makeSystemConfig,
} from '../../helpers/repositoryMocks';
import { Role, EmployeeStatus, ProjectStatus } from '../../../../server/src/types/enums';

describe('AdminService', () => {
  let userRepo: jest.Mocked<UserRepository>;
  let employeeRepo: jest.Mocked<EmployeeRepository>;
  let skillRepo: jest.Mocked<EmployeeSkillRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let milestoneRepo: jest.Mocked<MilestoneRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let authService: jest.Mocked<AuthService>;
  let service: AdminService;

  beforeEach(() => {
    userRepo = createMockRepo<UserRepository>();
    employeeRepo = createMockRepo<EmployeeRepository>();
    skillRepo = createMockRepo<EmployeeSkillRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    milestoneRepo = createMockRepo<MilestoneRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    allocationRepo = createMockRepo<AllocationRepository>();
    authService = createMockRepo<AuthService>();
    authService.hashPassword.mockResolvedValue('hashed');

    service = new AdminService(
      userRepo,
      employeeRepo,
      skillRepo,
      projectRepo,
      milestoneRepo,
      configRepo,
      allocationRepo,
      authService,
    );
  });

  describe('createUser', () => {
    it('creates employee profile for EMPLOYEE role', async () => {
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(makeUser({ id: 5, role: Role.EMPLOYEE }));

      const result = await service.createUser({
        username: 'newemp',
        email: 'new@example.com',
        fullName: 'New Employee',
        role: Role.EMPLOYEE,
        temporaryPassword: 'TempPass1',
      });

      expect(employeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, name: 'New Employee' }),
      );
      expect(result.role).toBe(Role.EMPLOYEE);
    });

    it('rejects duplicate username', async () => {
      userRepo.findByUsername.mockResolvedValue(makeUser());
      await expect(
        service.createUser({
          username: 'taken',
          email: 'a@b.com',
          fullName: 'X',
          role: Role.ADMIN,
          temporaryPassword: 'TempPass1',
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects duplicate email', async () => {
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.findByEmail.mockResolvedValue(makeUser());
      await expect(
        service.createUser({
          username: 'unique',
          email: 'taken@b.com',
          fullName: 'X',
          role: Role.ADMIN,
          temporaryPassword: 'TempPass1',
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('deactivateEmployee', () => {
    it('ends allocations and deactivates user and employee', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee({ id: 3, userId: 7 }));
      await service.deactivateEmployee(3);
      expect(allocationRepo.endAllActiveForEmployee).toHaveBeenCalledWith(3, expect.any(Date));
      expect(employeeRepo.updateStatus).toHaveBeenCalledWith(3, EmployeeStatus.BENCH, 0);
      expect(employeeRepo.setActiveStatus).toHaveBeenCalledWith(3, false);
      expect(userRepo.setActiveStatus).toHaveBeenCalledWith(7, false);
    });
  });

  describe('createProject', () => {
    it('creates project when manager is valid', async () => {
      userRepo.findById.mockResolvedValue(makeUser({ id: 10, role: Role.MANAGER }));
      projectRepo.save.mockResolvedValue(makeProject());

      const project = await service.createProject({
        name: 'New Proj',
        description: 'Desc',
        startDate: '01-01-2025',
        endDate: '31-12-2025',
        status: ProjectStatus.ACTIVE,
        managerId: 10,
      });

      expect(project.name).toBe('Test Project');
      expect(projectRepo.save).toHaveBeenCalled();
    });

    it('rejects non-manager as project owner', async () => {
      userRepo.findById.mockResolvedValue(makeUser({ role: Role.EMPLOYEE }));
      await expect(
        service.createProject({
          name: 'P',
          description: 'D',
          startDate: '01-01-2025',
          endDate: '31-12-2025',
          status: ProjectStatus.ACTIVE,
          managerId: 1,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('assignManager', () => {
    it('assigns manager to employee', async () => {
      employeeRepo.findByUserId.mockResolvedValue(makeEmployee({ id: 2 }));
      userRepo.findById.mockResolvedValue(makeUser({ id: 10, role: Role.MANAGER }));
      await service.assignManager({ employeeUserId: 5, managerId: 10 });
      expect(employeeRepo.assignManager).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('getSystemConfig', () => {
    it('returns config from repository', async () => {
      configRepo.getConfig.mockResolvedValue(makeSystemConfig());
      const config = await service.getSystemConfig();
      expect(config.maxWeeklyHours).toBe(40);
    });
  });
});
