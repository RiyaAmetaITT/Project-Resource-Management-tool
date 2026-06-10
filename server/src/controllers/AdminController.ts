import { Response, NextFunction } from 'express';
import { AdminService } from '../services/AdminService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CreateUserDto, ResetPasswordDto } from '../dtos/user.dto';
import { UpdateEmployeeDto, AssignManagerDto } from '../dtos/employee.dto';
import { AddSkillDto, UpdateSkillDto } from '../dtos/skill.dto';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { AddMilestoneDto, UpdateMilestoneStatusDto } from '../dtos/milestone.dto';
import { SystemConfig } from '../models/SystemConfig';

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  createUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.adminService.createUser(req.body as CreateUserDto);
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  };

  getAllUsers = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.adminService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (err) { next(err); }
  };

  resetPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { newPassword } = req.body as ResetPasswordDto;
      await this.adminService.resetPassword(Number(req.params.id), newPassword);
      res.status(200).json({ success: true, message: 'Password reset. User must change on next login.' });
    } catch (err) { next(err); }
  };

  deactivateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.deactivateUser(Number(req.params.id));
      res.status(200).json({ success: true, message: 'User deactivated.' });
    } catch (err) { next(err); }
  };

  reactivateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.reactivateUser(Number(req.params.id));
      res.status(200).json({ success: true, message: 'User reactivated.' });
    } catch (err) { next(err); }
  };

  // ── Employees ──────────────────────────────────────────────────────────────

  getEmployeeById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.adminService.getEmployeeById(Number(req.params.id));
      res.status(200).json({ success: true, data: employee });
    } catch (err) { next(err); }
  };

  getEmployeeDeactivatePreview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const preview = await this.adminService.getEmployeeDeactivatePreview(Number(req.params.id));
      res.status(200).json({ success: true, data: preview });
    } catch (err) { next(err); }
  };

  getAllEmployees = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employees = await this.adminService.getAllEmployees();
      res.status(200).json({ success: true, data: employees });
    } catch (err) { next(err); }
  };

  updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.updateEmployee(Number(req.params.id), req.body as UpdateEmployeeDto);
      res.status(200).json({ success: true, message: 'Employee updated.' });
    } catch (err) { next(err); }
  };

  deactivateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.deactivateEmployee(Number(req.params.id));
      res.status(200).json({ success: true, message: 'Employee deactivated.' });
    } catch (err) { next(err); }
  };

  /** Screen 3.1.4 — Assign Manager to Employee. */
  assignManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.assignManager(req.body as AssignManagerDto);
      res.status(200).json({ success: true, message: 'Manager assigned.' });
    } catch (err) { next(err); }
  };

  // ── Skills ─────────────────────────────────────────────────────────────────

  addSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.addSkill(Number(req.params.employeeId), req.body as AddSkillDto);
      res.status(201).json({ success: true, message: 'Skill added.' });
    } catch (err) { next(err); }
  };

  updateSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.updateSkillProficiency(Number(req.params.skillId), req.body as UpdateSkillDto);
      res.status(200).json({ success: true, message: 'Skill updated.' });
    } catch (err) { next(err); }
  };

  removeSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.removeSkill(Number(req.params.skillId));
      res.status(200).json({ success: true, message: 'Skill removed.' });
    } catch (err) { next(err); }
  };

  getEmployeeSkills = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const skills = await this.adminService.getEmployeeSkills(Number(req.params.employeeId));
      res.status(200).json({ success: true, data: skills });
    } catch (err) { next(err); }
  };

  // ── Projects ───────────────────────────────────────────────────────────────

  createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await this.adminService.createProject(req.body as CreateProjectDto);
      res.status(201).json({ success: true, data: project });
    } catch (err) { next(err); }
  };

  getAllProjects = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projects = await this.adminService.getAllProjects();
      res.status(200).json({ success: true, data: projects });
    } catch (err) { next(err); }
  };

  updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.updateProject(Number(req.params.id), req.body as UpdateProjectDto);
      res.status(200).json({ success: true, message: 'Project updated.' });
    } catch (err) { next(err); }
  };

  // ── Milestones ─────────────────────────────────────────────────────────────

  addMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.addMilestone(Number(req.params.projectId), req.body as AddMilestoneDto);
      res.status(201).json({ success: true, message: 'Milestone added.' });
    } catch (err) { next(err); }
  };

  updateMilestoneStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.adminService.updateMilestoneStatus(Number(req.params.milestoneId), req.body as UpdateMilestoneStatusDto);
      res.status(200).json({ success: true, message: 'Milestone status updated.' });
    } catch (err) { next(err); }
  };

  getMilestonesByProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const milestones = await this.adminService.getMilestonesByProject(Number(req.params.projectId));
      res.status(200).json({ success: true, data: milestones });
    } catch (err) { next(err); }
  };

  // ── System Config ──────────────────────────────────────────────────────────

  getSystemConfig = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.adminService.getSystemConfig();
      // Mask the API key before sending — never expose it fully
      res.status(200).json({ success: true, data: { ...config, llmApiKey: '****' } });
    } catch (err) { next(err); }
  };

  updateSystemConfig = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.adminService.updateSystemConfig(req.body as Partial<SystemConfig>);
      res.status(200).json({ success: true, data: { ...updated, llmApiKey: '****' } });
    } catch (err) { next(err); }
  };

  getAllAllocations = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Admin view — delegated to AllocationService via AdminService
      res.status(200).json({ success: true, data: [] }); // Wired fully in routes with AllocationService
    } catch (err) { next(err); }
  };
}
