import { UserRepository } from '../repositories/UserRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { SkillRepository } from '../repositories/SkillRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { UpdateEmployeeDto, EmployeeResponseDto, AssignManagerDto } from '../dtos/employee.dto';
import { AllocationResponseDto } from '../dtos/allocation.dto';
import { AddSkillDto, UpdateSkillDto } from '../dtos/skill.dto';
import { AppError } from '../errors/AppError';
import { Role, ResourceStatus } from '../types/enums';
import { ResourceProfile } from '../models/Resource';

export class AdminEmployeeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly skillRepository: SkillRepository,
    private readonly resourceSkillRepository: ResourceSkillRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly allocationRepository: AllocationRepository,
  ) {}

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

  private async findEmployeeOrThrow(id: number): Promise<ResourceProfile> {
    const profile = await this.resourceRepository.findEmployeeProfileById(id);
    if (!profile) {
      throw AppError.notFound(`Employee ${id} not found.`);
    }
    return profile;
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
}
