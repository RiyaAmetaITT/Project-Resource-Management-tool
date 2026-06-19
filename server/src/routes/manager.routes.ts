import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { ManagerController } from '../controllers/ManagerController';
import { createManagerService } from '../bootstrap/createManagerService';

const router = Router();
const managerOnly = requireRole(Role.MANAGER);

const managerService = createManagerService();
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
router.get('/timesheets/frozen-employees', managerOnly, controller.getFrozenEmployees);
router.put('/resources/employees/:id/restore-timesheet-access', managerOnly, controller.restoreTimesheetAccess);

router.post('/ai/skill-match', managerOnly, controller.aiSkillMatch);
router.post('/ai/risk-summary', managerOnly, controller.aiRiskSummary);
router.post('/ai/team-build', managerOnly, controller.aiTeamBuild);

export default router;
