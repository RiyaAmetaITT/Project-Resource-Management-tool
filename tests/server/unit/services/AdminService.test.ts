import { AdminService } from '../../../../server/src/services/AdminService';
import { AdminUserService } from '../../../../server/src/services/AdminUserService';
import { AdminEmployeeService } from '../../../../server/src/services/AdminEmployeeService';
import { AdminProjectService } from '../../../../server/src/services/AdminProjectService';
import { UserRepository } from '../../../../server/src/repositories/UserRepository';
import { RoleRepository } from '../../../../server/src/repositories/RoleRepository';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { SkillRepository } from '../../../../server/src/repositories/SkillRepository';
import { ResourceSkillRepository } from '../../../../server/src/repositories/ResourceSkillRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { MilestoneRepository } from '../../../../server/src/repositories/MilestoneRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { AllocationService } from '../../../../server/src/services/AllocationService';
import { AuthService } from '../../../../server/src/services/AuthService';
import {
  createMockRepo,
  makeUser,
  makeResourceProfile,
  makeProject,
  makeAllocation,
  makeSystemConfig,
} from '../../helpers/repositoryMocks';
import {
  Role,
  ResourceStatus,
  ProjectStatus,
  SkillCategory,
  Proficiency,
} from '../../../../server/src/types/enums';

describe('AdminService', () => {
  let userRepo: jest.Mocked<UserRepository>;
  let roleRepo: jest.Mocked<RoleRepository>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let skillRepo: jest.Mocked<SkillRepository>;
  let resourceSkillRepo: jest.Mocked<ResourceSkillRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let milestoneRepo: jest.Mocked<MilestoneRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let allocationService: jest.Mocked<AllocationService>;
  let authService: jest.Mocked<AuthService>;
  let service: AdminService;

  beforeEach(() => {
    userRepo = createMockRepo<UserRepository>();
    roleRepo = createMockRepo<RoleRepository>();
    resourceRepo = createMockRepo<ResourceRepository>();
    skillRepo = createMockRepo<SkillRepository>();
    resourceSkillRepo = createMockRepo<ResourceSkillRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    milestoneRepo = createMockRepo<MilestoneRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    allocationRepo = createMockRepo<AllocationRepository>();
    allocationService = createMockRepo<AllocationService>();
    authService = createMockRepo<AuthService>();
    authService.hashPassword.mockResolvedValue('hashed');

    service = new AdminService(
      new AdminUserService(userRepo, roleRepo, resourceRepo, authService),
      new AdminEmployeeService(
        userRepo,
        resourceRepo,
        skillRepo,
        resourceSkillRepo,
        projectRepo,
        allocationRepo,
      ),
      new AdminProjectService(userRepo, projectRepo, milestoneRepo),
      configRepo,
      allocationService,
    );
  });

  describe('createUser', () => {
    it('creates resource profile for EMPLOYEE role', async () => {
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.findByEmail.mockResolvedValue(null);
      roleRepo.findByName.mockResolvedValue({ id: 3, name: Role.EMPLOYEE });
      userRepo.save.mockResolvedValue(makeUser({ id: 5, role: Role.EMPLOYEE }));

      const result = await service.createUser({
        username: 'newemp',
        email: 'new@example.com',
        fullName: 'New Employee',
        role: Role.EMPLOYEE,
        temporaryPassword: 'TempPass1',
      });

      expect(resourceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 5 }));
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
    it('ends allocations and deactivates user account', async () => {
      resourceRepo.findEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 3, userId: 7 }));
      await service.deactivateEmployee(3);
      expect(allocationRepo.endAllActiveForResource).toHaveBeenCalledWith(3, expect.any(Date));
      expect(resourceRepo.updateStatus).toHaveBeenCalledWith(3, ResourceStatus.BENCH, 0);
      expect(userRepo.setActiveStatus).toHaveBeenCalledWith(7, false);
    });

    it('rejects deactivating a manager resource', async () => {
      resourceRepo.findEmployeeProfileById.mockResolvedValue(null);
      await expect(service.deactivateEmployee(99)).rejects.toMatchObject({ statusCode: 404 });
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
    it('assigns manager to employee user', async () => {
      userRepo.findById
        .mockResolvedValueOnce(makeUser({ id: 5, role: Role.EMPLOYEE }))
        .mockResolvedValueOnce(makeUser({ id: 10, role: Role.MANAGER }));
      resourceRepo.findByUserId.mockResolvedValue(makeResourceProfile({ id: 2, userId: 5 }));
      await service.assignManager({ employeeUserId: 5, managerId: 10 });
      expect(resourceRepo.assignManager).toHaveBeenCalledWith(2, 10);
      expect(userRepo.assignManager).toHaveBeenCalledWith(5, 10);
    });

    it('rejects assigning a manager to another manager', async () => {
      userRepo.findById.mockResolvedValue(makeUser({ id: 5, role: Role.MANAGER }));
      await expect(service.assignManager({ employeeUserId: 5, managerId: 10 })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(userRepo.assignManager).not.toHaveBeenCalled();
    });

    it('rejects when employee has no resource profile', async () => {
      userRepo.findById
        .mockResolvedValueOnce(makeUser({ id: 5, role: Role.EMPLOYEE }))
        .mockResolvedValueOnce(makeUser({ id: 10, role: Role.MANAGER }));
      resourceRepo.findByUserId.mockResolvedValue(null);

      await expect(service.assignManager({ employeeUserId: 5, managerId: 10 })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getSystemConfig', () => {
    it('returns config with masked API key', async () => {
      configRepo.getConfig.mockResolvedValue(makeSystemConfig({ llmApiKey: 'secret-key' }));
      const config = await service.getSystemConfig();
      expect(config.maxWeeklyHours).toBe(40);
      expect(config.llmApiKey).toBe('****');
    });
  });

  describe('getAllUsers', () => {
    it('maps users to response DTOs', async () => {
      userRepo.findAll.mockResolvedValue([makeUser({ id: 1, username: 'admin1' })]);
      const users = await service.getAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('admin1');
    });
  });

  describe('resetPassword', () => {
    it('hashes and updates password with force change flag', async () => {
      userRepo.findById.mockResolvedValue(makeUser({ id: 4 }));
      await service.resetPassword(4, 'NewPass1');
      expect(userRepo.updatePassword).toHaveBeenCalledWith(4, 'hashed', true);
    });

    it('rejects unknown user', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(service.resetPassword(99, 'NewPass1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('addSkill', () => {
    it('creates skill link for employee', async () => {
      resourceRepo.findEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 3 }));
      skillRepo.findOrCreate.mockResolvedValue({
        id: 8,
        skillName: 'Java',
        category: SkillCategory.BACKEND,
      });
      await service.addSkill(3, {
        skillName: 'Java',
        category: SkillCategory.BACKEND,
        proficiencyLevel: Proficiency.ADVANCED,
      });
      expect(resourceSkillRepo.save).toHaveBeenCalledWith({
        resourceId: 3,
        skillId: 8,
        proficiencyLevel: 'Advanced',
      });
    });
  });

  describe('addMilestone', () => {
    it('creates milestone for existing project', async () => {
      projectRepo.findById.mockResolvedValue(makeProject({ id: 1 }));
      await service.addMilestone(1, {
        title: 'MVP',
        dueDate: '30-06-2025',
        storyPoints: 20,
      });
      expect(milestoneRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 1, title: 'MVP', storyPoints: 20 }),
      );
    });
  });

  describe('getAllAllocations', () => {
    it('delegates to allocation service', async () => {
      allocationService.getAllAllocations.mockResolvedValue([]);
      await service.getAllAllocations();
      expect(allocationService.getAllAllocations).toHaveBeenCalled();
    });
  });

  describe('user lifecycle', () => {
    it('deactivates an existing user', async () => {
      userRepo.findById.mockResolvedValue(makeUser({ id: 3 }));
      await service.deactivateUser(3);
      expect(userRepo.setActiveStatus).toHaveBeenCalledWith(3, false);
    });

    it('reactivates an existing user', async () => {
      userRepo.findById.mockResolvedValue(makeUser({ id: 3, isActive: false }));
      await service.reactivateUser(3);
      expect(userRepo.setActiveStatus).toHaveBeenCalledWith(3, true);
    });
  });

  describe('employee management', () => {
    it('returns employee by id', async () => {
      resourceRepo.findEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 4 }));
      const employee = await service.getEmployeeById(4);
      expect(employee.id).toBe(4);
    });

    it('updates employee profile fields', async () => {
      resourceRepo.findEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 2, userId: 9 }));
      await service.updateEmployee(2, {
        name: 'Updated Name',
        email: 'updated@example.com',
        department: 'QA',
        designation: 'Tester',
      });
      expect(userRepo.updateProfile).toHaveBeenCalledWith(9, expect.objectContaining({ fullName: 'Updated Name' }));
    });

    it('returns deactivate preview with active allocations', async () => {
      resourceRepo.findEmployeeProfileById.mockResolvedValue(makeResourceProfile({ id: 2 }));
      allocationRepo.findActiveByResource.mockResolvedValue([
        makeAllocation({ id: 11, resourceId: 2, projectId: 5 }),
      ]);
      projectRepo.findById.mockResolvedValue(makeProject({ id: 5, name: 'Beta' }));

      const preview = await service.getEmployeeDeactivatePreview(2);

      expect(preview.activeAllocations).toHaveLength(1);
      expect(preview.activeAllocations[0].projectName).toBe('Beta');
    });
  });

  describe('project and milestone management', () => {
    it('returns all projects with manager and milestone stats', async () => {
      projectRepo.findAll.mockResolvedValue([makeProject({ id: 1, managerId: 10 })]);
      userRepo.findById.mockResolvedValue(makeUser({ id: 10, fullName: 'Manager One' }));
      milestoneRepo.findByProjectId.mockResolvedValue([]);

      const projects = await service.getAllProjects();

      expect(projects[0].managerName).toBe('Manager One');
    });

    it('updates an existing project', async () => {
      projectRepo.findById.mockResolvedValue(makeProject({ id: 1 }));
      await service.updateProject(1, { name: 'Renamed' });
      expect(projectRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Renamed' }));
    });

    it('updates status and manager without clearing dates', async () => {
      projectRepo.findById.mockResolvedValue(makeProject({ id: 3 }));
      userRepo.findById.mockResolvedValue(makeUser({ id: 6, role: Role.MANAGER }));

      await service.updateProject(3, { status: ProjectStatus.ON_HOLD, managerId: 6 });

      expect(projectRepo.update).toHaveBeenCalledWith(3, {
        status: ProjectStatus.ON_HOLD,
        managerId: 6,
      });
    });

    it('rejects milestone update when milestone missing', async () => {
      milestoneRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateMilestoneStatus(99, { status: 'DONE' as never }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('skill maintenance', () => {
    it('updates skill proficiency when link exists', async () => {
      resourceSkillRepo.findById.mockResolvedValue({
        id: 3,
        resourceId: 1,
        skillId: 2,
        proficiencyLevel: Proficiency.BEGINNER,
      });
      await service.updateSkillProficiency(3, { proficiencyLevel: Proficiency.ADVANCED });
      expect(resourceSkillRepo.updateProficiency).toHaveBeenCalledWith(3, Proficiency.ADVANCED);
    });

    it('removes skill link', async () => {
      await service.removeSkill(8);
      expect(resourceSkillRepo.delete).toHaveBeenCalledWith(8);
    });
  });

  describe('updateSystemConfig', () => {
    it('masks API key in updated config', async () => {
      configRepo.updateConfig.mockResolvedValue(makeSystemConfig({ llmApiKey: 'new-secret' }));
      const config = await service.updateSystemConfig({ maxWeeklyHours: 45 });
      expect(config.maxWeeklyHours).toBe(40);
      expect(config.llmApiKey).toBe('****');
    });
  });
});
