import { AdminService } from '../services/AdminService';
import { AdminUserService } from '../services/AdminUserService';
import { AdminEmployeeService } from '../services/AdminEmployeeService';
import { AdminProjectService } from '../services/AdminProjectService';
import { AuthService } from '../services/AuthService';
import { AllocationService } from '../services/AllocationService';
import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { SkillRepository } from '../repositories/SkillRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';

export function createAdminService(): AdminService {
  const userRepository = new UserRepository();
  const roleRepository = new RoleRepository();
  const resourceRepository = new ResourceRepository();
  const skillRepository = new SkillRepository();
  const resourceSkillRepository = new ResourceSkillRepository();
  const projectRepository = new ProjectRepository();
  const milestoneRepository = new MilestoneRepository();
  const allocationRepository = new AllocationRepository();
  const configRepository = new SystemConfigRepository();

  const authService = new AuthService(userRepository);
  const allocationService = new AllocationService(
    allocationRepository,
    resourceRepository,
    projectRepository,
  );

  const userService = new AdminUserService(
    userRepository,
    roleRepository,
    resourceRepository,
    authService,
  );
  const employeeService = new AdminEmployeeService(
    userRepository,
    resourceRepository,
    skillRepository,
    resourceSkillRepository,
    projectRepository,
    allocationRepository,
  );
  const projectService = new AdminProjectService(
    userRepository,
    projectRepository,
    milestoneRepository,
  );

  return new AdminService(
    userService,
    employeeService,
    projectService,
    configRepository,
    allocationService,
  );
}
