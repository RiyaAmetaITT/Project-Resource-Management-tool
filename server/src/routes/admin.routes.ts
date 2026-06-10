import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { AdminController } from '../controllers/AdminController';
import { AdminService } from '../services/AdminService';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmployeeSkillRepository } from '../repositories/EmployeeSkillRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { AllocationService } from '../services/AllocationService';
import { AllocationRepository } from '../repositories/AllocationRepository';

const router = Router();
const adminOnly = requireRole(Role.ADMIN);

// Wire dependencies (composition root)
const userRepo = new UserRepository();
const employeeRepo = new EmployeeRepository();
const skillRepo = new EmployeeSkillRepository();
const projectRepo = new ProjectRepository();
const milestoneRepo = new MilestoneRepository();
const allocationRepo = new AllocationRepository();
const configRepo = new SystemConfigRepository();

const authService = new AuthService(userRepo);
const adminService = new AdminService(userRepo, employeeRepo, skillRepo, projectRepo, milestoneRepo, configRepo, allocationRepo, authService);
const allocationService = new AllocationService(allocationRepo, employeeRepo, projectRepo);

const ctrl = new AdminController(adminService);

// ── User routes ──────────────────────────────────────────────────────────────
router.post('/users', adminOnly, ctrl.createUser);
router.get('/users', adminOnly, ctrl.getAllUsers);
router.put('/users/:id/reset-password', adminOnly, ctrl.resetPassword);
router.put('/users/:id/deactivate', adminOnly, ctrl.deactivateUser);
router.put('/users/:id/reactivate', adminOnly, ctrl.reactivateUser);

// ── Employee routes ──────────────────────────────────────────────────────────
router.get('/employees', adminOnly, ctrl.getAllEmployees);
router.get('/employees/:id', adminOnly, ctrl.getEmployeeById);
router.get('/employees/:id/deactivate-preview', adminOnly, ctrl.getEmployeeDeactivatePreview);
router.put('/employees/:id', adminOnly, ctrl.updateEmployee);
router.put('/employees/:id/deactivate', adminOnly, ctrl.deactivateEmployee);
router.put('/employees/assign-manager', adminOnly, ctrl.assignManager);

// ── Skill routes ─────────────────────────────────────────────────────────────
router.get('/employees/:employeeId/skills', adminOnly, ctrl.getEmployeeSkills);
router.post('/employees/:employeeId/skills', adminOnly, ctrl.addSkill);
router.put('/skills/:skillId', adminOnly, ctrl.updateSkill);
router.delete('/skills/:skillId', adminOnly, ctrl.removeSkill);

// ── Project routes ────────────────────────────────────────────────────────────
router.post('/projects', adminOnly, ctrl.createProject);
router.get('/projects', adminOnly, ctrl.getAllProjects);
router.put('/projects/:id', adminOnly, ctrl.updateProject);

// ── Milestone routes ──────────────────────────────────────────────────────────
router.get('/projects/:projectId/milestones', adminOnly, ctrl.getMilestonesByProject);
router.post('/projects/:projectId/milestones', adminOnly, ctrl.addMilestone);
router.put('/milestones/:milestoneId/status', adminOnly, ctrl.updateMilestoneStatus);

// ── Allocations (admin read-only view) ───────────────────────────────────────
router.get('/allocations', adminOnly, async (_req, res, next) => {
  try {
    const allocations = await allocationService.getAllAllocations();
    res.status(200).json({ success: true, data: allocations });
  } catch (err) { next(err); }
});

// ── System config ─────────────────────────────────────────────────────────────
router.get('/config', adminOnly, ctrl.getSystemConfig);
router.put('/config', adminOnly, ctrl.updateSystemConfig);

export default router;
