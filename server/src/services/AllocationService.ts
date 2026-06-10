import { AllocationRepository } from '../repositories/AllocationRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { AllocateDto, AllocationResponseDto } from '../dtos/allocation.dto';
import { AppError } from '../errors/AppError';
import { EmployeeStatus, ProjectStatus } from '../types/enums';
import { parseDate } from '../utils/dateUtils';

const MAX_UTILISATION_PERCENT = 100;

export class AllocationService {
  constructor(
    private readonly allocationRepository: AllocationRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async allocateResource(dto: AllocateDto): Promise<AllocationResponseDto> {
    const employee = await this.findActiveEmployeeOrThrow(dto.employeeId);
    const project = await this.findAllocatableProjectOrThrow(dto.projectId);

    const fromDate = parseDate(dto.fromDate);
    const toDate = parseDate(dto.toDate);
    this.assertFromBeforeTo(fromDate, toDate);

    const currentTotal = await this.allocationRepository.sumUtilisationInPeriod(
      dto.employeeId,
      fromDate,
      toDate,
    );

    const newTotal = currentTotal + dto.utilisationPercent;
    if (newTotal > MAX_UTILISATION_PERCENT) {
      throw AppError.badRequest(
        `Over-allocation: ${employee.name} would reach ${newTotal}% utilisation (max ${MAX_UTILISATION_PERCENT}%).`,
      );
    }

    const allocation = await this.allocationRepository.save({
      employeeId: dto.employeeId,
      projectId: dto.projectId,
      utilisationPercent: dto.utilisationPercent,
      fromDate,
      toDate,
    });

    await this.updateEmployeeStatusAfterChange(dto.employeeId);

    return {
      id: allocation.id,
      employeeId: employee.id,
      employeeName: employee.name,
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
    await this.updateEmployeeStatusAfterChange(allocation.employeeId);
  }

  /** Ensures the employee belongs to the manager's direct team (BRD V4 scoping rule). */
  async assertEmployeeInManagerTeam(employeeId: number, managerUserId: number): Promise<void> {
    const employee = await this.findActiveEmployeeOrThrow(employeeId);
    if (employee.managerId !== managerUserId) {
      throw AppError.forbidden('You can only allocate employees assigned to your team.');
    }
  }

  /** Ensures only the project owner can manage allocations on that project. */
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

  async getActiveAllocationsForEmployee(employeeId: number) {
    return this.allocationRepository.findActiveByEmployee(employeeId);
  }

  async getAllocationById(allocationId: number) {
    return this.allocationRepository.findById(allocationId);
  }

  /** Computes the current total utilisation for an employee based on active allocations. */
  async computeEmployeeUtilisation(employeeId: number): Promise<number> {
    const today = new Date();
    return this.allocationRepository.sumUtilisationInPeriod(employeeId, today, today);
  }

  async updateEmployeeStatusAfterChange(employeeId: number): Promise<void> {
    const utilisation = await this.computeEmployeeUtilisation(employeeId);
    const status = utilisation > 0 ? EmployeeStatus.ALLOCATED : EmployeeStatus.BENCH;
    await this.employeeRepository.updateStatus(employeeId, status, utilisation);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findActiveEmployeeOrThrow(employeeId: number) {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee || !employee.isActive) {
      throw AppError.notFound(`Employee ${employeeId} not found or inactive.`);
    }
    return employee;
  }

  private async findAllocatableProjectOrThrow(projectId: number) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw AppError.notFound(`Project ${projectId} not found.`);
    if (project.status === ProjectStatus.ON_HOLD) {
      throw AppError.badRequest(`Cannot allocate to an ON_HOLD project.`);
    }
    return project;
  }

  private assertFromBeforeTo(fromDate: Date, toDate: Date): void {
    if (fromDate >= toDate) {
      throw AppError.badRequest('From date must be before to date.');
    }
  }

  private async enrichAllocation(allocation: { employeeId: number; projectId: number; id: number; utilisationPercent: number; fromDate: Date; toDate: Date }): Promise<AllocationResponseDto> {
    const [employee, project] = await Promise.all([
      this.employeeRepository.findById(allocation.employeeId),
      this.projectRepository.findById(allocation.projectId),
    ]);
    return {
      id: allocation.id,
      employeeId: allocation.employeeId,
      employeeName: employee?.name ?? 'Unknown',
      projectId: allocation.projectId,
      projectName: project?.name ?? 'Unknown',
      utilisationPercent: allocation.utilisationPercent,
      fromDate: allocation.fromDate,
      toDate: allocation.toDate,
    };
  }
}
