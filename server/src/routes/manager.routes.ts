import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { ManagerController } from '../controllers/ManagerController';
import { ManagerService } from '../services/ManagerService';
import { AllocationService } from '../services/AllocationService';
import { TimesheetService } from '../services/TimesheetService';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';

const router = Router();
const managerOnly = requireRole(Role.MANAGER);

const allocationRepository = new AllocationRepository();
const resourceRepository = new ResourceRepository();
const resourceSkillRepository = new ResourceSkillRepository();
const activityTagRepository = new ActivityTagRepository();
const projectRepository = new ProjectRepository();
const milestoneRepository = new MilestoneRepository();
const timesheetRepository = new TimesheetRepository();
const timesheetEntryRepository = new TimesheetEntryRepository();
const configRepository = new SystemConfigRepository();

const allocationService = new AllocationService(
  allocationRepository,
  resourceRepository,
  projectRepository,
);
const timesheetService = new TimesheetService(
  timesheetRepository,
  timesheetEntryRepository,
  activityTagRepository,
  allocationRepository,
  resourceRepository,
  projectRepository,
  configRepository,
);
const aiServiceFactory = new AIServiceFactory(configRepository);
const managerService = new ManagerService(
  allocationService,
  timesheetService,
  aiServiceFactory,
  resourceRepository,
  resourceSkillRepository,
  activityTagRepository,
  projectRepository,
  milestoneRepository,
  configRepository,
);

const controller = new ManagerController(managerService);

router.get('/resources/dashboard', managerOnly, controller.getResourceDashboard);
router.get('/resources/employees/:id', managerOnly, controller.getEmployeeDetail);

router.post('/allocations', managerOnly, controller.allocateResource);
router.post('/allocations/validate', managerOnly, controller.validateAllocation);
router.put('/allocations/:id/end', managerOnly, controller.endAllocation);
router.get('/projects/:projectId/allocations', managerOnly, controller.getActiveAllocationsForProject);

router.get('/projects', managerOnly, controller.getMyProjects);
router.get('/projects/:id/detail', managerOnly, controller.getProjectDetail);

router.get('/timesheets', managerOnly, controller.getTeamTimesheets);
router.get('/timesheets/detail', managerOnly, controller.getEmployeeTimesheetDetail);

router.post('/ai/skill-match', managerOnly, controller.aiSkillMatch);
router.post('/ai/risk-summary', managerOnly, controller.aiRiskSummary);
router.post('/ai/team-build', managerOnly, controller.aiTeamBuild);

export default router;
