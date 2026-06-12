import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { SkillRepository } from '../repositories/SkillRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { AllocationService } from './AllocationService';
import { AuthService } from './AuthService';
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto';
import { UpdateEmployeeDto, EmployeeResponseDto, AssignManagerDto } from '../dtos/employee.dto';
import { AllocationResponseDto } from '../dtos/allocation.dto';
import { AddSkillDto, UpdateSkillDto } from '../dtos/skill.dto';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from '../dtos/project.dto';
import { AddMilestoneDto, UpdateMilestoneStatusDto } from '../dtos/milestone.dto';
import { User } from '../models/User';
import { ResourceProfile } from '../models/Resource';
import { Project } from '../models/Project';
import { AppError } from '../errors/AppError';
import { Role, ResourceStatus, MilestoneStatus } from '../types/enums';
import { SystemConfig } from '../models/SystemConfig';
import { parseDate } from '../utils/dateUtils';

export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly skillRepository: SkillRepository,
    private readonly resourceSkillRepository: ResourceSkillRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly configRepository: SystemConfigRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly allocationService: AllocationService,
    private readonly authService: AuthService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertUsernameIsUnique(dto.username);
    await this.assertEmailIsUnique(dto.email);

    const roleRecord = await this.roleRepository.findByName(dto.role);
    if (!roleRecord) throw AppError.badRequest(`Invalid role: ${dto.role}`);

    const passwordHash = await this.authService.hashPassword(dto.temporaryPassword);

    const user = await this.userRepository.save({
      roleId: roleRecord.id,
      fullName: dto.fullName,
      email: dto.email,
      username: dto.username,
      passwordHash,
      forcePasswordChange: true,
      isActive: true,
      department: dto.role === Role.ADMIN ? null : 'Unassigned',
      designation: dto.role === Role.ADMIN ? null : 'Unassigned',
    });

    if (dto.role === Role.EMPLOYEE || dto.role === Role.MANAGER) {
      await this.resourceRepository.save({ userId: user.id });
    }

    return this.toUserResponse(user);
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((u) => this.toUserResponse(u));
  }

  async resetPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound(`User ${userId} not found.`);

    const passwordHash = await this.authService.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, passwordHash, true);
  }

  async deactivateUser(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound(`User ${userId} not found.`);
    await this.userRepository.setActiveStatus(userId, false);
  }

  async reactivateUser(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound(`User ${userId} not found.`);
    await this.userRepository.setActiveStatus(userId, true);
  }

  async getEmployeeById(id: number): Promise<EmployeeResponseDto> {
    const profile = await this.findEmployeeOrThrow(id);
    return this.toEmployeeResponse(profile);
  }

  async getEmployeeDeactivatePreview(id: number): Promise<{
    employee: EmployeeResponseDto;
    activeAllocations: AllocationResponseDto[];
  }> {
    const employee = await this.getEmployeeById(id);
    const allocations = await this.allocationRepository.findActiveByResource(id);
    const activeAllocations = await Promise.all(
      allocations.map(async (a) => {
        const project = await this.projectRepository.findById(a.projectId);
        return {
          id: a.id,
          employeeId: a.resourceId,
          employeeName: employee.name,
          projectId: a.projectId,
          projectName: project?.name ?? 'Unknown',
          utilisationPercent: a.utilisationPercent,
          fromDate: a.fromDate,
          toDate: a.toDate,
        };
      }),
    );
    return { employee, activeAllocations };
  }

  async getAllEmployees(): Promise<EmployeeResponseDto[]> {
    const resources = await this.resourceRepository.findAllEmployees();
    return resources.map((r) => this.toEmployeeResponse(r));
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto): Promise<void> {
    const profile = await this.findEmployeeOrThrow(id);

    await this.userRepository.updateProfile(profile.userId, {
      fullName: dto.name,
      email: dto.email,
      department: dto.department,
      designation: dto.designation,
    });
  }

  async deactivateEmployee(id: number): Promise<void> {
    const profile = await this.findEmployeeOrThrow(id);

    const today = new Date();
    await this.allocationRepository.endAllActiveForResource(id, today);
    await this.resourceRepository.updateStatus(id, ResourceStatus.BENCH, 0);
    await this.userRepository.setActiveStatus(profile.userId, false);
  }

  async addSkill(employeeId: number, dto: AddSkillDto): Promise<void> {
    await this.findEmployeeOrThrow(employeeId);

    const skill = await this.skillRepository.findOrCreate(dto.skillName, dto.category);
    await this.resourceSkillRepository.save({
      resourceId: employeeId,
      skillId: skill.id,
      proficiencyLevel: dto.proficiencyLevel,
    });
  }

  async updateSkillProficiency(skillId: number, dto: UpdateSkillDto): Promise<void> {
    const link = await this.resourceSkillRepository.findById(skillId);
    if (!link) throw AppError.notFound(`Skill ${skillId} not found.`);
    await this.resourceSkillRepository.updateProficiency(skillId, dto.proficiencyLevel);
  }

  async removeSkill(skillId: number): Promise<void> {
    await this.resourceSkillRepository.delete(skillId);
  }

  async getEmployeeSkills(employeeId: number): Promise<Array<{
    id: number;
    employeeId: number;
    skillName: string;
    category: string;
    proficiencyLevel: string;
  }>> {
    await this.findEmployeeOrThrow(employeeId);
    const skills = await this.resourceSkillRepository.findByResourceId(employeeId);
    return skills.map((s) => ({
      id: s.id,
      employeeId: s.resourceId,
      skillName: s.skillName,
      category: s.category,
      proficiencyLevel: s.proficiencyLevel,
    }));
  }

  async createProject(dto: CreateProjectDto): Promise<Project> {
    const manager = await this.userRepository.findById(dto.managerId);
    if (!manager || manager.role !== Role.MANAGER) {
      throw AppError.badRequest(`User ${dto.managerId} is not a Manager.`);
    }
    return this.projectRepository.save({
      name: dto.name,
      description: dto.description,
      startDate: parseDate(dto.startDate),
      endDate: parseDate(dto.endDate),
      totalStoryPoints: dto.totalStoryPoints ?? 0,
      status: dto.status,
      managerId: dto.managerId,
    });
  }

  async getAllProjects(): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.findAll();
    return Promise.all(projects.map((p) => this.toProjectResponse(p)));
  }

  async updateProject(id: number, dto: UpdateProjectDto): Promise<void> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw AppError.notFound(`Project ${id} not found.`);
    await this.projectRepository.update(id, {
      ...dto,
      startDate: dto.startDate ? parseDate(dto.startDate) : undefined,
      endDate: dto.endDate ? parseDate(dto.endDate) : undefined,
    });
  }

  async addMilestone(projectId: number, dto: AddMilestoneDto): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw AppError.notFound(`Project ${projectId} not found.`);
    await this.milestoneRepository.save({
      projectId,
      title: dto.title,
      dueDate: parseDate(dto.dueDate),
      storyPoints: dto.storyPoints ?? 0,
    });
  }

  async updateMilestoneStatus(milestoneId: number, dto: UpdateMilestoneStatusDto): Promise<void> {
    const milestone = await this.milestoneRepository.findById(milestoneId);
    if (!milestone) throw AppError.notFound(`Milestone ${milestoneId} not found.`);
    await this.milestoneRepository.updateStatus(milestoneId, dto.status);
  }

  async getMilestonesByProject(projectId: number) {
    return this.milestoneRepository.findByProjectId(projectId);
  }

  async assignManager(dto: AssignManagerDto): Promise<void> {
    const user = await this.userRepository.findById(dto.employeeUserId);
    if (!user) throw AppError.notFound(`User ${dto.employeeUserId} not found.`);
    if (user.role !== Role.EMPLOYEE) {
      throw AppError.badRequest('Manager assignment is only available for employees.');
    }

    const resource = await this.resourceRepository.findByUserId(dto.employeeUserId);
    if (!resource) {
      throw AppError.notFound(`No resource profile found for user ${dto.employeeUserId}.`);
    }

    const manager = await this.userRepository.findById(dto.managerId);
    if (!manager || manager.role !== Role.MANAGER) {
      throw AppError.badRequest(`User ${dto.managerId} is not a Manager.`);
    }

    await this.resourceRepository.assignManager(resource.id, dto.managerId);
    await this.userRepository.assignManager(dto.employeeUserId, dto.managerId);
  }

  async getAllAllocations(): Promise<AllocationResponseDto[]> {
    return this.allocationService.getAllAllocations();
  }

  async getSystemConfig(): Promise<SystemConfig> {
    const config = await this.configRepository.getConfig();
    return this.maskSensitiveConfigFields(config);
  }

  async updateSystemConfig(fields: Partial<SystemConfig>): Promise<SystemConfig> {
    const updated = await this.configRepository.updateConfig(fields);
    return this.maskSensitiveConfigFields(updated);
  }

  private maskSensitiveConfigFields(config: SystemConfig): SystemConfig {
    return { ...config, llmApiKey: '****' };
  }

  private async findEmployeeOrThrow(id: number): Promise<ResourceProfile> {
    const profile = await this.resourceRepository.findEmployeeProfileById(id);
    if (!profile) {
      throw AppError.notFound(`Employee ${id} not found.`);
    }
    return profile;
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }

  private toEmployeeResponse(profile: ResourceProfile): EmployeeResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      managerId: profile.managerId,
      name: profile.fullName,
      email: profile.email,
      department: profile.department ?? 'Unassigned',
      designation: profile.designation ?? 'Unassigned',
      status: profile.status,
      totalUtilisation: profile.totalUtilisation,
      isActive: profile.isActive,
    };
  }

  private async assertUsernameIsUnique(username: string): Promise<void> {
    const existing = await this.userRepository.findByUsername(username);
    if (existing) throw AppError.conflict(`Username '${username}' is already taken.`);
  }

  private async assertEmailIsUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw AppError.conflict(`Email '${email}' is already registered.`);
  }

  private async toProjectResponse(project: Project): Promise<ProjectResponseDto> {
    const [manager, milestones] = await Promise.all([
      this.userRepository.findById(project.managerId),
      this.milestoneRepository.findByProjectId(project.id),
    ]);

    const completedStoryPoints = milestones
      .filter((m) => m.status === MilestoneStatus.DONE)
      .reduce((sum, m) => sum + (m.storyPoints ?? 0), 0);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      totalStoryPoints: project.totalStoryPoints,
      completedStoryPoints,
      status: project.status,
      healthStatus: project.healthStatus,
      managerId: project.managerId,
      managerName: manager?.fullName ?? 'Unknown',
    };
  }
}
