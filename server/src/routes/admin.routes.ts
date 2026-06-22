import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { AdminController } from '../controllers/AdminController';
import { createAdminService } from '../bootstrap/createAdminService';

const router = Router();
const adminOnly = requireRole(Role.ADMIN);
const controller = new AdminController(createAdminService());

router.post('/users', adminOnly, controller.createUser);
router.get('/users', adminOnly, controller.getAllUsers);
router.put('/users/:id/reset-password', adminOnly, controller.resetPassword);
router.put('/users/:id/deactivate', adminOnly, controller.deactivateUser);
router.put('/users/:id/reactivate', adminOnly, controller.reactivateUser);

router.get('/employees', adminOnly, controller.getAllEmployees);
router.put('/employees/assign-manager', adminOnly, controller.assignManager);
router.get('/employees/:id/deactivate-preview', adminOnly, controller.getEmployeeDeactivatePreview);
router.put('/employees/:id/deactivate', adminOnly, controller.deactivateEmployee);
router.get('/employees/:id', adminOnly, controller.getEmployeeById);
router.put('/employees/:id', adminOnly, controller.updateEmployee);

router.get('/employees/:employeeId/skills', adminOnly, controller.getEmployeeSkills);
router.post('/employees/:employeeId/skills', adminOnly, controller.addSkill);
router.put('/skills/:skillId', adminOnly, controller.updateSkill);
router.delete('/skills/:skillId', adminOnly, controller.removeSkill);

router.post('/projects', adminOnly, controller.createProject);
router.get('/projects', adminOnly, controller.getAllProjects);
router.put('/projects/:id', adminOnly, controller.updateProject);

router.get('/projects/:projectId/milestones', adminOnly, controller.getMilestonesByProject);
router.post('/projects/:projectId/milestones', adminOnly, controller.addMilestone);
router.put('/milestones/:milestoneId/status', adminOnly, controller.updateMilestoneStatus);

router.get('/allocations', adminOnly, controller.getAllAllocations);

router.get('/config', adminOnly, controller.getSystemConfig);
router.put('/config', adminOnly, controller.updateSystemConfig);

export default router;
