import { AdminUserService } from './AdminUserService';
import { AdminEmployeeService } from './AdminEmployeeService';
import { AdminProjectService } from './AdminProjectService';
import { AllocationService } from './AllocationService';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto';
import { UpdateEmployeeDto, EmployeeResponseDto, AssignManagerDto } from '../dtos/employee.dto';
import { AllocationResponseDto } from '../dtos/allocation.dto';
import { AddSkillDto, UpdateSkillDto } from '../dtos/skill.dto';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from '../dtos/project.dto';
import { AddMilestoneDto, UpdateMilestoneStatusDto } from '../dtos/milestone.dto';
import { Project } from '../models/Project';
import { SystemConfig } from '../models/SystemConfig';
import { AppError } from '../errors/AppError';

export class AdminService {
  constructor(
    private readonly userService: AdminUserService,
    private readonly employeeService: AdminEmployeeService,
    private readonly projectService: AdminProjectService,
    private readonly configRepository: SystemConfigRepository,
    private readonly allocationService: AllocationService,
  ) {}

  createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.createUser(dto);
  }

  getAllUsers(): Promise<UserResponseDto[]> {
    return this.userService.getAllUsers();
  }

  resetPassword(userId: number, newPassword: string): Promise<void> {
    return this.userService.resetPassword(userId, newPassword);
  }

  deactivateUser(userId: number): Promise<void> {
    return this.userService.deactivateUser(userId);
  }

  reactivateUser(userId: number): Promise<void> {
    return this.userService.reactivateUser(userId);
  }

  getEmployeeById(id: number): Promise<EmployeeResponseDto> {
    return this.employeeService.getEmployeeById(id);
  }

  getEmployeeDeactivatePreview(id: number): Promise<{
    employee: EmployeeResponseDto;
    activeAllocations: AllocationResponseDto[];
  }> {
    return this.employeeService.getEmployeeDeactivatePreview(id);
  }

  getAllEmployees(): Promise<EmployeeResponseDto[]> {
    return this.employeeService.getAllEmployees();
  }

  updateEmployee(id: number, dto: UpdateEmployeeDto): Promise<void> {
    return this.employeeService.updateEmployee(id, dto);
  }

  deactivateEmployee(id: number): Promise<void> {
    return this.employeeService.deactivateEmployee(id);
  }

  addSkill(employeeId: number, dto: AddSkillDto): Promise<void> {
    return this.employeeService.addSkill(employeeId, dto);
  }

  updateSkillProficiency(skillId: number, dto: UpdateSkillDto): Promise<void> {
    return this.employeeService.updateSkillProficiency(skillId, dto);
  }

  removeSkill(skillId: number): Promise<void> {
    return this.employeeService.removeSkill(skillId);
  }

  getEmployeeSkills(employeeId: number): Promise<Array<{
    id: number;
    employeeId: number;
    skillName: string;
    category: string;
    proficiencyLevel: string;
  }>> {
    return this.employeeService.getEmployeeSkills(employeeId);
  }

  assignManager(dto: AssignManagerDto): Promise<void> {
    return this.employeeService.assignManager(dto);
  }

  createProject(dto: CreateProjectDto): Promise<Project> {
    return this.projectService.createProject(dto);
  }

  getAllProjects(): Promise<ProjectResponseDto[]> {
    return this.projectService.getAllProjects();
  }

  updateProject(id: number, dto: UpdateProjectDto): Promise<void> {
    return this.projectService.updateProject(id, dto);
  }

  addMilestone(projectId: number, dto: AddMilestoneDto): Promise<void> {
    return this.projectService.addMilestone(projectId, dto);
  }

  updateMilestoneStatus(milestoneId: number, dto: UpdateMilestoneStatusDto): Promise<void> {
    return this.projectService.updateMilestoneStatus(milestoneId, dto);
  }

  getMilestonesByProject(projectId: number) {
    return this.projectService.getMilestonesByProject(projectId);
  }

  getAllAllocations(): Promise<AllocationResponseDto[]> {
    return this.allocationService.getAllAllocations();
  }

  async getSystemConfig(): Promise<SystemConfig> {
    const config = await this.loadSystemConfig();
    return this.maskSensitiveConfigFields(config);
  }

  async updateSystemConfig(fields: Partial<SystemConfig>): Promise<SystemConfig> {
    try {
      const updated = await this.configRepository.updateConfig(fields);
      return this.maskSensitiveConfigFields(updated);
    } catch (err) {
      if (err instanceof Error) {
        throw AppError.notFound(err.message);
      }
      throw err;
    }
  }

  private async loadSystemConfig(): Promise<SystemConfig> {
    try {
      return await this.configRepository.getConfig();
    } catch (err) {
      if (err instanceof Error) {
        throw AppError.notFound(err.message);
      }
      throw err;
    }
  }

  private maskSensitiveConfigFields(config: SystemConfig): SystemConfig {
    return { ...config, llmApiKey: '****' };
  }
}
