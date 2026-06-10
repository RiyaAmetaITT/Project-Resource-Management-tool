import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { ManagerController } from '../controllers/ManagerController';
import { AllocationService } from '../services/AllocationService';
import { TimesheetService } from '../services/TimesheetService';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmployeeSkillRepository } from '../repositories/EmployeeSkillRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';

const router = Router();
const managerOnly = requireRole(Role.MANAGER);

// Composition root
const allocationRepo = new AllocationRepository();
const employeeRepo = new EmployeeRepository();
const skillRepo = new EmployeeSkillRepository();
const activityTagRepo = new ActivityTagRepository();
const projectRepo = new ProjectRepository();
const milestoneRepo = new MilestoneRepository();
const timesheetRepo = new TimesheetRepository();
const entryRepo = new TimesheetEntryRepository();
const configRepo = new SystemConfigRepository();

const allocationService = new AllocationService(allocationRepo, employeeRepo, projectRepo);
const timesheetService = new TimesheetService(timesheetRepo, entryRepo, activityTagRepo, allocationRepo, employeeRepo, projectRepo, configRepo);
const aiFactory = new AIServiceFactory(configRepo);

const ctrl = new ManagerController(
  allocationService,
  timesheetService,
  aiFactory,
  employeeRepo,
  skillRepo,
  activityTagRepo,
  projectRepo,
  milestoneRepo,
);

// ── Resource Dashboard ────────────────────────────────────────────────────────
router.get('/resources/dashboard', managerOnly, ctrl.getResourceDashboard);
router.get('/resources/employees/:id', managerOnly, ctrl.getEmployeeDetail);

// ── Allocation ────────────────────────────────────────────────────────────────
router.post('/allocations', managerOnly, ctrl.allocateResource);
router.put('/allocations/:id/end', managerOnly, ctrl.endAllocation);
router.get('/projects/:projectId/allocations', managerOnly, ctrl.getActiveAllocationsForProject);

// ── My Projects ───────────────────────────────────────────────────────────────
router.get('/projects', managerOnly, ctrl.getMyProjects);
router.get('/projects/:id/detail', managerOnly, ctrl.getProjectDetail);

// ── Timesheets ────────────────────────────────────────────────────────────────
router.get('/timesheets', managerOnly, ctrl.getTeamTimesheets);

// ── AI ────────────────────────────────────────────────────────────────────────
router.post('/ai/skill-match', managerOnly, ctrl.aiSkillMatch);
router.post('/ai/risk-summary', managerOnly, ctrl.aiRiskSummary);

export default router;
