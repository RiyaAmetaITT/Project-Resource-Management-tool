import { UserRepository } from '../repositories/UserRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmployeeSkillRepository } from '../repositories/EmployeeSkillRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { AuthService } from './AuthService';
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto';
import { UpdateEmployeeDto, EmployeeResponseDto, AssignManagerDto } from '../dtos/employee.dto';
import { AllocationResponseDto } from '../dtos/allocation.dto';
import { AddSkillDto, UpdateSkillDto } from '../dtos/skill.dto';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { AddMilestoneDto, UpdateMilestoneStatusDto } from '../dtos/milestone.dto';
import { User } from '../models/User';
import { Employee } from '../models/Employee';
import { Project } from '../models/Project';
import { AppError } from '../errors/AppError';
import { Role, EmployeeStatus } from '../types/enums';
import { SystemConfig } from '../models/SystemConfig';
import { parseDate } from '../utils/dateUtils';

export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly skillRepository: EmployeeSkillRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly configRepository: SystemConfigRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly authService: AuthService,
  ) {}

  // ── User Management ────────────────────────────────────────────────────────

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertUsernameIsUnique(dto.username);
    await this.assertEmailIsUnique(dto.email);

    const passwordHash = await this.authService.hashPassword(dto.temporaryPassword);

    const user = await this.userRepository.save({
      fullName: dto.fullName,
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: dto.role,
      forcePasswordChange: true,
      isActive: true,
    });

    // BRD V4: employee profiles are created via Create User Account (no separate Add Employee screen)
    if (dto.role === Role.EMPLOYEE || dto.role === Role.MANAGER) {
      await this.employeeRepository.save({
        userId: user.id,
        name: dto.fullName,
        email: dto.email,
        department: 'Unassigned',
        designation: 'Unassigned',
      });
    }

    return this.toUserResponse(user);
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map(this.toUserResponse);
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

    const employee = await this.employeeRepository.findByUserId(userId);
    if (employee && !employee.isActive) {
      await this.employeeRepository.setActiveStatus(employee.id, true);
    }
  }

  // ── Employee Management ────────────────────────────────────────────────────

  async getEmployeeById(id: number): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) throw AppError.notFound(`Employee ${id} not found.`);
    return this.toEmployeeResponse(employee);
  }

  async getEmployeeDeactivatePreview(id: number): Promise<{
    employee: EmployeeResponseDto;
    activeAllocations: AllocationResponseDto[];
  }> {
    const employee = await this.getEmployeeById(id);
    const allocations = await this.allocationRepository.findActiveByEmployee(id);
    const activeAllocations = await Promise.all(
      allocations.map(async (a) => {
        const project = await this.projectRepository.findById(a.projectId);
        return {
          id: a.id,
          employeeId: a.employeeId,
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
    const employees = await this.employeeRepository.findAll();
    return employees.map(this.toEmployeeResponse);
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto): Promise<void> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) throw AppError.notFound(`Employee ${id} not found.`);
    await this.employeeRepository.update(id, dto);
  }

  async deactivateEmployee(id: number): Promise<void> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) throw AppError.notFound(`Employee ${id} not found.`);

    const today = new Date();
    await this.allocationRepository.endAllActiveForEmployee(id, today);
    await this.employeeRepository.updateStatus(id, EmployeeStatus.BENCH, 0);
    await this.employeeRepository.setActiveStatus(id, false);
    await this.userRepository.setActiveStatus(employee.userId, false);
  }

  // ── Skill Management ───────────────────────────────────────────────────────

  async addSkill(employeeId: number, dto: AddSkillDto): Promise<void> {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) throw AppError.notFound(`Employee ${employeeId} not found.`);
    await this.skillRepository.save({ ...dto, employeeId });
  }

  async updateSkillProficiency(skillId: number, dto: UpdateSkillDto): Promise<void> {
    const skill = await this.skillRepository.findById(skillId);
    if (!skill) throw AppError.notFound(`Skill ${skillId} not found.`);
    await this.skillRepository.updateProficiency(skillId, dto.proficiencyLevel);
  }

  async removeSkill(skillId: number): Promise<void> {
    await this.skillRepository.delete(skillId);
  }

  async getEmployeeSkills(employeeId: number) {
    return this.skillRepository.findByEmployeeId(employeeId);
  }

  // ── Project Management ─────────────────────────────────────────────────────

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

  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
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

  // ── Milestone Management ───────────────────────────────────────────────────

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

  /** Links an employee to a manager (Screen 3.1.4 — Assign Manager). */
  async assignManager(dto: AssignManagerDto): Promise<void> {
    const employee = await this.employeeRepository.findByUserId(dto.employeeUserId);
    if (!employee) {
      throw AppError.notFound(`No employee profile found for user ${dto.employeeUserId}.`);
    }

    const manager = await this.userRepository.findById(dto.managerId);
    if (!manager || manager.role !== Role.MANAGER) {
      throw AppError.badRequest(`User ${dto.managerId} is not a Manager.`);
    }

    await this.employeeRepository.assignManager(employee.id, dto.managerId);
  }

  // ── System Configuration ───────────────────────────────────────────────────

  async getSystemConfig(): Promise<SystemConfig> {
    return this.configRepository.getConfig();
  }

  async updateSystemConfig(fields: Partial<SystemConfig>): Promise<SystemConfig> {
    return this.configRepository.updateConfig(fields);
  }

  // ── Private mappers ────────────────────────────────────────────────────────

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

  private toEmployeeResponse(employee: Employee): EmployeeResponseDto {
    return {
      id: employee.id,
      userId: employee.userId,
      managerId: employee.managerId ?? null,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      status: employee.status,
      totalUtilisation: employee.totalUtilisation,
      isActive: employee.isActive,
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
}
