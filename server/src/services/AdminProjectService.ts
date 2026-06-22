import { UserRepository } from '../repositories/UserRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from '../dtos/project.dto';
import { AddMilestoneDto, UpdateMilestoneStatusDto } from '../dtos/milestone.dto';
import { AppError } from '../errors/AppError';
import { Role, MilestoneStatus } from '../types/enums';
import { Project } from '../models/Project';
import { parseDate } from '../utils/dateUtils';

export class AdminProjectService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
  ) {}

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

    if (dto.managerId !== undefined) {
      const manager = await this.userRepository.findById(dto.managerId);
      if (!manager || manager.role !== Role.MANAGER) {
        throw AppError.badRequest(`User ${dto.managerId} is not a Manager.`);
      }
    }

    const updates: Partial<Project> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.startDate !== undefined) updates.startDate = parseDate(dto.startDate);
    if (dto.endDate !== undefined) updates.endDate = parseDate(dto.endDate);
    if (dto.totalStoryPoints !== undefined) updates.totalStoryPoints = dto.totalStoryPoints;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.managerId !== undefined) updates.managerId = dto.managerId;

    await this.projectRepository.update(id, updates);
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
