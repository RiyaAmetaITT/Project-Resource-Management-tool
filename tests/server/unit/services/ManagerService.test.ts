import { ManagerService } from '../../../../server/src/services/ManagerService';
import { ManagerTeamService } from '../../../../server/src/services/ManagerTeamService';
import { ManagerAIService } from '../../../../server/src/services/ManagerAIService';
import { AllocationService } from '../../../../server/src/services/AllocationService';
import { TimesheetService } from '../../../../server/src/services/TimesheetService';
import { AIServiceFactory } from '../../../../server/src/services/ai/AIServiceFactory';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { ResourceSkillRepository } from '../../../../server/src/repositories/ResourceSkillRepository';
import { ActivityTagRepository } from '../../../../server/src/repositories/ActivityTagRepository';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { MilestoneRepository } from '../../../../server/src/repositories/MilestoneRepository';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { IAIService } from '../../../../server/src/services/ai/IAIService';
import {
  createMockRepo,
  makeResourceProfile,
  makeProject,
  makeAllocation,
  makeSystemConfig,
} from '../../helpers/repositoryMocks';
import {
  ResourceStatus,
  HealthFlag,
  SkillCategory,
  Proficiency,
} from '../../../../server/src/types/enums';

describe('ManagerService', () => {
  let allocationService: jest.Mocked<AllocationService>;
  let timesheetService: jest.Mocked<TimesheetService>;
  let aiServiceFactory: jest.Mocked<AIServiceFactory>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let resourceSkillRepo: jest.Mocked<ResourceSkillRepository>;
  let activityTagRepo: jest.Mocked<ActivityTagRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let milestoneRepo: jest.Mocked<MilestoneRepository>;
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let aiService: jest.Mocked<IAIService>;
  let service: ManagerService;

  beforeEach(() => {
    allocationService = createMockRepo<AllocationService>();
    timesheetService = createMockRepo<TimesheetService>();
    aiServiceFactory = createMockRepo<AIServiceFactory>();
    resourceRepo = createMockRepo<ResourceRepository>();
    resourceSkillRepo = createMockRepo<ResourceSkillRepository>();
    activityTagRepo = createMockRepo<ActivityTagRepository>();
    projectRepo = createMockRepo<ProjectRepository>();
    milestoneRepo = createMockRepo<MilestoneRepository>();
    configRepo = createMockRepo<SystemConfigRepository>();
    aiService = createMockRepo<IAIService>();

    aiServiceFactory.create.mockResolvedValue(aiService);
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ maxWeeklyHours: 40 }));

    service = new ManagerService(
      new ManagerTeamService(
        allocationService,
        timesheetService,
        resourceRepo,
        resourceSkillRepo,
        activityTagRepo,
        projectRepo,
        milestoneRepo,
        configRepo,
      ),
      new ManagerAIService(
        allocationService,
        timesheetService,
        aiServiceFactory,
        resourceRepo,
        resourceSkillRepo,
        activityTagRepo,
        projectRepo,
        milestoneRepo,
        configRepo,
      ),
    );
  });

  describe('getResourceDashboard', () => {
    it('splits bench and allocated resources with partial count', async () => {
      resourceRepo.findByManagerId.mockResolvedValue([
        makeResourceProfile({ id: 1, status: ResourceStatus.BENCH, totalUtilisation: 0 }),
        makeResourceProfile({ id: 2, status: ResourceStatus.ALLOCATED, totalUtilisation: 50 }),
        makeResourceProfile({ id: 3, status: ResourceStatus.ALLOCATED, totalUtilisation: 100 }),
      ]);
      resourceSkillRepo.findByResourceId.mockResolvedValue([
        { id: 1, resourceId: 1, skillId: 8, skillName: 'Java', category: SkillCategory.BACKEND, proficiencyLevel: Proficiency.ADVANCED },
      ]);

      const dashboard = await service.getResourceDashboard(10);

      expect(dashboard.bench).toHaveLength(1);
      expect(dashboard.allocated).toHaveLength(2);
      expect(dashboard.partialCount).toBe(1);
      expect(dashboard.bench[0].skills).toContain('Java');
    });
  });

  describe('getEmployeeDetail', () => {
    it('returns profile, skills, allocations, and tags for team member', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(
        makeResourceProfile({ id: 2, managerId: 10 }),
      );
      resourceSkillRepo.findByResourceId.mockResolvedValue([]);
      allocationService.getActiveAllocationsForEmployee.mockResolvedValue([]);
      activityTagRepo.findRecentTagsByResource.mockResolvedValue(['Testing']);

      const detail = await service.getEmployeeDetail(10, 2);

      expect(detail.employee.name).toBe('Jane Employee');
      expect(detail.recentTags).toEqual(['Testing']);
    });

    it('rejects employees outside manager team', async () => {
      resourceRepo.findActiveEmployeeProfileById.mockResolvedValue(
        makeResourceProfile({ id: 2, managerId: 99 }),
      );

      await expect(service.getEmployeeDetail(10, 2)).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('allocateResource', () => {
    it('asserts ownership and delegates allocation', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      allocationService.assertEmployeeInManagerTeam.mockResolvedValue(undefined);
      allocationService.allocateResource.mockResolvedValue({
        id: 1,
        employeeId: 2,
        employeeName: 'Jane',
        projectId: 3,
        projectName: 'Alpha',
        utilisationPercent: 50,
        fromDate: new Date(),
        toDate: new Date(),
      });

      const dto = {
        employeeId: 2,
        projectId: 3,
        utilisationPercent: 50,
        fromDate: '01-01-2025',
        toDate: '31-12-2025',
      };

      await service.allocateResource(10, dto);

      expect(allocationService.allocateResource).toHaveBeenCalledWith(dto);
    });
  });

  describe('endAllocation', () => {
    it('ends allocation when manager owns project', async () => {
      allocationService.getAllocationById.mockResolvedValue(makeAllocation({ id: 5, projectId: 3 }));
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);

      await service.endAllocation(10, 5);

      expect(allocationService.endAllocation).toHaveBeenCalledWith(5);
    });

    it('throws when allocation is missing', async () => {
      allocationService.getAllocationById.mockResolvedValue(null);
      await expect(service.endAllocation(10, 99)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('performSkillMatch', () => {
    it('throws when no candidates meet capacity requirement', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      resourceRepo.findAllActiveEmployees.mockResolvedValue([
        makeResourceProfile({ fullName: 'Jane', totalUtilisation: 100 }),
      ]);
      resourceSkillRepo.findByResourceId.mockResolvedValue([]);
      activityTagRepo.findRecentTagsByResource.mockResolvedValue([]);

      await expect(
        service.performSkillMatch(10, 1, '10 hrs/week Java developer'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('returns enriched AI matches for qualified candidates', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      resourceRepo.findAllActiveEmployees.mockResolvedValue([
        makeResourceProfile({ id: 2, fullName: 'Jane', totalUtilisation: 0 }),
      ]);
      resourceSkillRepo.findByResourceId.mockResolvedValue([
        { id: 1, resourceId: 2, skillId: 8, skillName: 'Java', category: SkillCategory.BACKEND, proficiencyLevel: Proficiency.ADVANCED },
      ]);
      activityTagRepo.findRecentTagsByResource.mockResolvedValue(['Backend']);
      aiService.generateSkillMatch.mockResolvedValue([
        { employeeId: 0, name: 'Jane', reason: 'Strong Java skills', suggestedUtilisationPercent: 50 },
      ]);

      const result = await service.performSkillMatch(10, 1, 'Java developer');

      expect(result.projectId).toBe(1);
      expect(result.results[0].employeeId).toBe(2);
      expect(result.results[0].skillsMatch).toContain('Java');
    });
  });

  describe('performTeamBuild', () => {
    it('rejects empty requirement', async () => {
      await expect(service.performTeamBuild(10, '   ')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('uses rule-based matching when AI returns no assignments', async () => {
      aiService.generateTeamBuild.mockResolvedValue([]);
      resourceRepo.findAllActiveEmployees.mockResolvedValue([
        makeResourceProfile({
          id: 1,
          fullName: 'Alice',
          status: ResourceStatus.BENCH,
          department: 'Engineering',
          designation: 'Developer',
        }),
      ]);
      resourceSkillRepo.findByResourceId.mockResolvedValue([
        { id: 1, resourceId: 1, skillId: 8, skillName: 'Java', category: SkillCategory.BACKEND, proficiencyLevel: Proficiency.ADVANCED },
      ]);

      const result = await service.performTeamBuild(10, 'Java Developer');

      expect(result.filled.length + result.unfilled.length).toBeGreaterThan(0);
      expect(result.benchSearched).toBe(1);
    });
  });

  describe('performRiskSummary', () => {
    it('returns fallback summary when AI fails', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      projectRepo.findById.mockResolvedValue(makeProject({ name: 'Risk Project' }));
      milestoneRepo.findByProjectId.mockResolvedValue([
        {
          id: 1,
          projectId: 1,
          title: 'Release',
          dueDate: new Date('2025-01-01'),
          storyPoints: 10,
          status: 'IN_PROGRESS',
          healthFlag: HealthFlag.OVERDUE,
        } as never,
      ]);
      allocationService.getActiveAllocationsForProject.mockResolvedValue([]);
      aiService.generateRiskSummary.mockRejectedValue(new Error('AI down'));

      const summary = await service.performRiskSummary(10, 1);

      expect(summary).toContain('Rule-based fallback');
      expect(summary).toContain('Risk Project');
    });
  });

  describe('getProjectDetail', () => {
    it('flags overdue milestones and low logged hours', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      projectRepo.findById.mockResolvedValue(makeProject({ id: 1, managerId: 10 }));
      milestoneRepo.findByProjectId.mockResolvedValue([
        {
          id: 1,
          projectId: 1,
          title: 'Go Live',
          dueDate: new Date('2025-01-01'),
          storyPoints: 10,
          status: 'IN_PROGRESS',
          healthFlag: HealthFlag.OVERDUE,
        } as never,
      ]);
      allocationService.getActiveAllocationsForProject.mockResolvedValue([
        {
          id: 1,
          employeeId: 2,
          employeeName: 'Jane',
          projectId: 1,
          projectName: 'Alpha',
          utilisationPercent: 100,
          fromDate: new Date(),
          toDate: new Date(),
        },
      ]);
      timesheetService.getEmployeeWeekDetail.mockResolvedValue({
        employeeName: 'Jane',
        weekStartDate: '01-06-2025',
        status: 'SUBMITTED',
        entries: [{ projectId: 1, projectName: 'Alpha', hours: 2, activityTags: [] }],
        totalHours: 2,
      });

      const detail = await service.getProjectDetail(10, 1);

      expect(detail.riskFlags.some((f) => f.message.includes('overdue'))).toBe(true);
      expect(detail.riskFlags.some((f) => f.message.includes('logged only'))).toBe(true);
    });

    it('returns project facts and positive allocation flag when healthy', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      projectRepo.findById.mockResolvedValue(makeProject({ id: 1, managerId: 10 }));
      milestoneRepo.findByProjectId.mockResolvedValue([]);
      allocationService.getActiveAllocationsForProject.mockResolvedValue([
        {
          id: 1,
          employeeId: 2,
          employeeName: 'Jane',
          projectId: 1,
          projectName: 'Alpha',
          utilisationPercent: 50,
          fromDate: new Date(),
          toDate: new Date(),
        },
      ]);
      timesheetService.getEmployeeWeekDetail.mockResolvedValue({
        employeeName: 'Jane',
        weekStartDate: '01-06-2025',
        status: 'SUBMITTED',
        entries: [{ projectId: 1, projectName: 'Alpha', hours: 20, activityTags: [] }],
        totalHours: 20,
      });

      const detail = await service.getProjectDetail(10, 1);

      expect(detail.project?.id).toBe(1);
      expect(detail.riskFlags.some((f) => f.isPositive)).toBe(true);
    });
  });

  describe('getMyProjects', () => {
    it('returns projects for manager', async () => {
      projectRepo.findByManagerId.mockResolvedValue([makeProject({ managerId: 10 })]);
      const projects = await service.getMyProjects(10);
      expect(projects).toHaveLength(1);
    });
  });

  describe('validateAllocation', () => {
    it('delegates after ownership checks', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      allocationService.assertEmployeeInManagerTeam.mockResolvedValue(undefined);
      allocationService.validateAllocation.mockResolvedValue({
        employeeName: 'Jane',
        currentTotal: 20,
        newTotal: 70,
        isValid: true,
      });

      const dto = {
        employeeId: 2,
        projectId: 3,
        utilisationPercent: 50,
        fromDate: '01-01-2025',
        toDate: '31-12-2025',
      };
      const result = await service.validateAllocation(10, dto);

      expect(result.isValid).toBe(true);
      expect(allocationService.validateAllocation).toHaveBeenCalledWith(dto);
    });
  });

  describe('getTeamTimesheets', () => {
    it('delegates to timesheet service', async () => {
      const weekStart = new Date('2025-06-02');
      timesheetService.getTeamTimesheets.mockResolvedValue([]);
      await service.getTeamTimesheets(10, weekStart);
      expect(timesheetService.getTeamTimesheets).toHaveBeenCalledWith(10, weekStart);
    });
  });

  describe('performRiskSummary', () => {
    it('returns AI summary when service succeeds', async () => {
      allocationService.assertManagerOwnsProject.mockResolvedValue(undefined);
      projectRepo.findById.mockResolvedValue(makeProject({ name: 'Alpha' }));
      milestoneRepo.findByProjectId.mockResolvedValue([]);
      allocationService.getActiveAllocationsForProject.mockResolvedValue([]);
      aiService.generateRiskSummary.mockResolvedValue('| Risk | Low | OK | None |');

      const summary = await service.performRiskSummary(10, 1);

      expect(summary).toContain('Risk');
      expect(aiService.generateRiskSummary).toHaveBeenCalled();
    });
  });
});
