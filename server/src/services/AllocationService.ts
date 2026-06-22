import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { AllocateDto, AllocationResponseDto, AllocationValidationDto } from '../dtos/allocation.dto';
import { AppError } from '../errors/AppError';
import { ResourceStatus, ProjectStatus } from '../types/enums';
import { parseDate } from '../utils/dateUtils';
import { MAX_UTILISATION_PERCENT } from '../constants';

export class AllocationService {
  constructor(
    private readonly allocationRepository: AllocationRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async validateAllocation(dto: AllocateDto): Promise<AllocationValidationDto> {
    const profile = await this.findActiveResourceOrThrow(dto.employeeId);
    await this.findAllocatableProjectOrThrow(dto.projectId);

    const fromDate = parseDate(dto.fromDate);
    const toDate = parseDate(dto.toDate);
    this.assertFromBeforeTo(fromDate, toDate);

    const currentTotal = await this.allocationRepository.sumUtilisationInPeriod(
      dto.employeeId,
      fromDate,
      toDate,
    );
    const newTotal = currentTotal + dto.utilisationPercent;

    return {
      employeeName: profile.fullName,
      currentTotal,
      newTotal,
      isValid: newTotal <= MAX_UTILISATION_PERCENT,
    };
  }

  async allocateResource(dto: AllocateDto): Promise<AllocationResponseDto> {
    const resourceId = dto.employeeId;
    const profile = await this.findActiveResourceOrThrow(resourceId);
    const project = await this.findAllocatableProjectOrThrow(dto.projectId);

    const fromDate = parseDate(dto.fromDate);
    const toDate = parseDate(dto.toDate);
    this.assertFromBeforeTo(fromDate, toDate);

    const validation = await this.validateAllocation(dto);
    if (!validation.isValid) {
      throw AppError.badRequest(
        `Over-allocation: ${profile.fullName} would reach ${validation.newTotal}% utilisation (max ${MAX_UTILISATION_PERCENT}%).`,
      );
    }

    const allocation = await this.allocationRepository.save({
      resourceId,
      projectId: dto.projectId,
      utilisationPercent: dto.utilisationPercent,
      fromDate,
      toDate,
    });

    await this.updateResourceStatusAfterChange(resourceId);

    return {
      id: allocation.id,
      employeeId: resourceId,
      employeeName: profile.fullName,
      projectId: project.id,
      projectName: project.name,
      utilisationPercent: allocation.utilisationPercent,
      fromDate: allocation.fromDate,
      toDate: allocation.toDate,
    };
  }

  async endAllocation(allocationId: number): Promise<void> {
    const allocation = await this.allocationRepository.findById(allocationId);
    if (!allocation) throw AppError.notFound(`Allocation ${allocationId} not found.`);
    await this.allocationRepository.endAllocation(allocationId, new Date());
    await this.updateResourceStatusAfterChange(allocation.resourceId);
  }

  async assertEmployeeInManagerTeam(employeeId: number, managerUserId: number): Promise<void> {
    const profile = await this.findActiveResourceOrThrow(employeeId);
    if (profile.managerId !== managerUserId) {
      throw AppError.forbidden('You can only allocate employees assigned to your team.');
    }
  }

  async assertManagerOwnsProject(projectId: number, managerUserId: number): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw AppError.notFound(`Project ${projectId} not found.`);
    if (project.managerId !== managerUserId) {
      throw AppError.forbidden('You can only manage allocations on your own projects.');
    }
  }

  async getAllAllocations(): Promise<AllocationResponseDto[]> {
    const allocations = await this.allocationRepository.findAll();
    return Promise.all(allocations.map((a) => this.enrichAllocation(a)));
  }

  async getActiveAllocationsForProject(projectId: number): Promise<AllocationResponseDto[]> {
    const allocations = await this.allocationRepository.findActiveByProject(projectId);
    return Promise.all(allocations.map((a) => this.enrichAllocation(a)));
  }

  async getActiveAllocationsForEmployee(resourceId: number): Promise<AllocationResponseDto[]> {
    const allocations = await this.allocationRepository.findActiveByResource(resourceId);
    return Promise.all(allocations.map((a) => this.enrichAllocation(a)));
  }

  async getAllocationById(allocationId: number) {
    return this.allocationRepository.findById(allocationId);
  }

  async computeEmployeeUtilisation(resourceId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.allocationRepository.sumUtilisationInPeriod(resourceId, today, today);
  }

  async updateResourceStatusAfterChange(resourceId: number): Promise<void> {
    const utilisation = await this.computeEmployeeUtilisation(resourceId);
    const status = utilisation > 0 ? ResourceStatus.ALLOCATED : ResourceStatus.BENCH;
    await this.resourceRepository.updateStatus(resourceId, status, utilisation);
  }

  private async findActiveResourceOrThrow(resourceId: number) {
    const profile = await this.resourceRepository.findActiveEmployeeProfileById(resourceId);
    if (!profile) {
      throw AppError.notFound(`Employee ${resourceId} not found or inactive.`);
    }
    return profile;
  }

  private async findAllocatableProjectOrThrow(projectId: number) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw AppError.notFound(`Project ${projectId} not found.`);
    if (project.status === ProjectStatus.ON_HOLD) {
      throw AppError.badRequest('Cannot allocate to an ON_HOLD project.');
    }
    if (project.status === ProjectStatus.COMPLETED) {
      throw AppError.badRequest('Cannot allocate to a COMPLETED project.');
    }
    return project;
  }

  private assertFromBeforeTo(fromDate: Date, toDate: Date): void {
    if (fromDate >= toDate) {
      throw AppError.badRequest('From date must be before to date.');
    }
  }

  private async enrichAllocation(allocation: {
    resourceId: number;
    projectId: number;
    id: number;
    utilisationPercent: number;
    fromDate: Date;
    toDate: Date;
  }): Promise<AllocationResponseDto> {
    const [profile, project] = await Promise.all([
      this.resourceRepository.findProfileById(allocation.resourceId),
      this.projectRepository.findById(allocation.projectId),
    ]);
    return {
      id: allocation.id,
      employeeId: allocation.resourceId,
      employeeName: profile?.fullName ?? 'Unknown',
      projectId: allocation.projectId,
      projectName: project?.name ?? 'Unknown',
      utilisationPercent: allocation.utilisationPercent,
      fromDate: allocation.fromDate,
      toDate: allocation.toDate,
    };
  }
}
