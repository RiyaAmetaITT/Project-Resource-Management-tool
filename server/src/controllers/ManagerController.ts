import { Response, NextFunction } from 'express';
import { AllocationService } from '../services/AllocationService';
import { TimesheetService } from '../services/TimesheetService';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmployeeSkillRepository } from '../repositories/EmployeeSkillRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AllocateDto } from '../dtos/allocation.dto';
import { SkillMatchRequestDto, RiskSummaryRequestDto } from '../dtos/timesheet.dto';
import { getWeekStartDate } from '../utils/dateUtils';
import { CandidateSummary, ProjectFacts } from '../services/ai/IAIService';
import { AppError } from '../errors/AppError';

// Re-export SkillMatchRequestDto from its proper home
export type { SkillMatchRequestDto };

export class ManagerController {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly timesheetService: TimesheetService,
    private readonly aiServiceFactory: AIServiceFactory,
    private readonly employeeRepository: EmployeeRepository,
    private readonly skillRepository: EmployeeSkillRepository,
    private readonly activityTagRepository: ActivityTagRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
  ) {}

  // ── Resource Dashboard ────────────────────────────────────────────────────

  getResourceDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Scoped to the logged-in manager's team (BRD V4: manager visibility rule)
      const employees = await this.employeeRepository.findByManagerId(req.user!.userId);
      const bench = employees.filter((e) => e.status === 'BENCH');
      const allocated = employees.filter((e) => e.status === 'ALLOCATED');
      res.status(200).json({ success: true, data: { bench, allocated } });
    } catch (err) { next(err); }
  };

  getEmployeeDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = Number(req.params.id);
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee || employee.managerId !== req.user!.userId) {
        throw AppError.forbidden('You can only view employees assigned to your team.');
      }
      const skills = await this.skillRepository.findByEmployeeId(employeeId);
      const activeAllocations = await this.allocationService.getActiveAllocationsForEmployee(employeeId);
      const recentTags = await this.activityTagRepository.findRecentTagsByEmployee(employeeId, 4);
      res.status(200).json({ success: true, data: { employee, skills, activeAllocations, recentTags } });
    } catch (err) { next(err); }
  };

  // ── Allocation Management ─────────────────────────────────────────────────

  allocateResource = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as AllocateDto;
      await this.allocationService.assertManagerOwnsProject(dto.projectId, req.user!.userId);
      await this.allocationService.assertEmployeeInManagerTeam(dto.employeeId, req.user!.userId);
      const result = await this.allocationService.allocateResource(dto);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  };

  endAllocation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allocationId = Number(req.params.id);
      const allocation = await this.allocationService.getAllocationById(allocationId);
      if (!allocation) throw AppError.notFound(`Allocation ${allocationId} not found.`);
      await this.allocationService.assertManagerOwnsProject(allocation.projectId, req.user!.userId);
      await this.allocationService.endAllocation(allocationId);
      res.status(200).json({ success: true, message: 'Allocation ended.' });
    } catch (err) { next(err); }
  };

  getActiveAllocationsForProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = Number(req.params.projectId);
      await this.allocationService.assertManagerOwnsProject(projectId, req.user!.userId);
      const allocations = await this.allocationService.getActiveAllocationsForProject(projectId);
      res.status(200).json({ success: true, data: allocations });
    } catch (err) { next(err); }
  };

  // ── My Projects ───────────────────────────────────────────────────────────

  getMyProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projects = await this.projectRepository.findByManagerId(req.user!.userId);
      res.status(200).json({ success: true, data: projects });
    } catch (err) { next(err); }
  };

  getProjectDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = Number(req.params.id);
      const [project, milestones, allocations] = await Promise.all([
        this.projectRepository.findById(projectId),
        this.milestoneRepository.findByProjectId(projectId),
        this.allocationService.getActiveAllocationsForProject(projectId),
      ]);

      // Build risk flags for Screen 4.3 — surfaces overdue milestones and resource issues
      const riskFlags = [
        ...milestones
          .filter((m) => m.healthFlag === 'OVERDUE')
          .map((m) => ({ type: 'OVERDUE_MILESTONE', message: `${m.title} milestone is overdue` })),
      ];

      res.status(200).json({ success: true, data: { project, milestones, allocations, riskFlags } });
    } catch (err) { next(err); }
  };

  // ── Timesheets ────────────────────────────────────────────────────────────

  getTeamTimesheets = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const weekStartDate = req.query.week
        ? new Date(req.query.week as string)
        : getWeekStartDate();
      const timesheets = await this.timesheetService.getTeamTimesheets(req.user!.userId, weekStartDate);
      res.status(200).json({ success: true, data: timesheets });
    } catch (err) { next(err); }
  };

  // ── AI Features ───────────────────────────────────────────────────────────

  aiSkillMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId, requirement } = req.body as SkillMatchRequestDto;
      const candidates = await this.buildCandidateSummaries(req.user!.userId);
      const aiService = await this.aiServiceFactory.create();
      const results = await aiService.generateSkillMatch(requirement, candidates);

      // Resolve employeeId from matched name (AI returns names, not IDs)
      const allEmployees = await this.employeeRepository.findAllActive();
      const enrichedResults = results.map((r) => {
        const matched = allEmployees.find((e) => e.name === r.name);
        return { ...r, employeeId: matched?.id ?? 0 };
      });

      res.status(200).json({ success: true, data: { projectId, results: enrichedResults } });
    } catch (err) { next(err); }
  };

  aiRiskSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.body as RiskSummaryRequestDto;
      const facts = await this.buildProjectFacts(projectId);
      const aiService = await this.aiServiceFactory.create();
      const summary = await aiService.generateRiskSummary(facts);
      res.status(200).json({ success: true, data: { summary } });
    } catch (err) { next(err); }
  };

  // ── Private data-assembly helpers ─────────────────────────────────────────

  private async buildCandidateSummaries(managerId: number): Promise<CandidateSummary[]> {
    // Scoped to the manager's own team (BRD V4: manager visibility rule)
    const employees = await this.employeeRepository.findByManagerId(managerId);
    return Promise.all(
      employees.map(async (e) => {
        const skills = await this.skillRepository.findByEmployeeId(e.id);
        const recentTags = await this.activityTagRepository.findRecentTagsByEmployee(e.id, 4);
        return {
          name: e.name,
          skills: skills.map((s) => s.skillName),
          availablePercent: 100 - e.totalUtilisation,
          recentActivityTags: recentTags,
        };
      }),
    );
  }

  private async buildProjectFacts(projectId: number): Promise<ProjectFacts> {
    const project = await this.projectRepository.findById(projectId);
    const milestones = await this.milestoneRepository.findByProjectId(projectId);
    const allocations = await this.allocationService.getActiveAllocationsForProject(projectId);

    return {
      projectName: project?.name ?? 'Unknown',
      milestones: milestones.map((m) => ({
        title: m.title,
        dueDate: new Date(m.dueDate),
        status: m.status,
        isOverdue: m.healthFlag === 'OVERDUE',
      })),
      allocatedResources: allocations.map((a) => ({
        name: a.employeeName,
        utilisationPercent: a.utilisationPercent,
      })),
      recentHoursSummary: [], // Populated by a future enhancement with timesheet data
    };
  }
}
