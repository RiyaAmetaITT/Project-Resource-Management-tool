import { Response, NextFunction } from 'express';

import { ManagerService } from '../services/ManagerService';
import { AuthenticatedRequest, getAuthenticatedUser } from '../middleware/authMiddleware';
import { AllocateDto } from '../dtos/allocation.dto';
import { SkillMatchRequestDto, RiskSummaryRequestDto, TeamBuildRequestDto } from '../dtos/timesheet.dto';
import { resolveWeekStartDate } from '../utils/dateUtils';
import { parseRouteId, parseQueryId } from '../utils/paramUtils';

export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  getResourceDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.managerService.getResourceDashboard(getAuthenticatedUser(req).userId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getEmployeeDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.managerService.getEmployeeDetail(
        getAuthenticatedUser(req).userId,
        parseRouteId(req.params.id, 'employee ID'),
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  allocateResource = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.managerService.allocateResource(
        getAuthenticatedUser(req).userId,
        req.body as AllocateDto,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  validateAllocation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = await this.managerService.validateAllocation(
        getAuthenticatedUser(req).userId,
        req.body as AllocateDto,
      );
      res.status(200).json({ success: true, data: validation });
    } catch (err) {
      next(err);
    }
  };

  endAllocation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.managerService.endAllocation(
        getAuthenticatedUser(req).userId,
        parseRouteId(req.params.id, 'allocation ID'),
      );
      res.status(200).json({ success: true, message: 'Allocation ended.' });
    } catch (err) {
      next(err);
    }
  };

  getActiveAllocationsForProject = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const allocations = await this.managerService.getActiveAllocationsForProject(
        getAuthenticatedUser(req).userId,
        parseRouteId(req.params.projectId, 'project ID'),
      );
      res.status(200).json({ success: true, data: allocations });
    } catch (err) {
      next(err);
    }
  };

  getMyProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projects = await this.managerService.getMyProjects(getAuthenticatedUser(req).userId);
      res.status(200).json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  };

  getProjectDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.managerService.getProjectDetail(
        getAuthenticatedUser(req).userId,
        parseRouteId(req.params.id, 'project ID'),
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getTeamTimesheets = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const weekStartDate = resolveWeekStartDate(req.query.week);
      const timesheets = await this.managerService.getTeamTimesheets(
        getAuthenticatedUser(req).userId,
        weekStartDate,
      );
      res.status(200).json({ success: true, data: timesheets });
    } catch (err) {
      next(err);
    }
  };

  getEmployeeTimesheetDetail = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const weekStartDate = resolveWeekStartDate(req.query.week);
      const detail = await this.managerService.getEmployeeTimesheetDetail(
        getAuthenticatedUser(req).userId,
        parseQueryId(req.query.employeeId, 'employee ID'),
        weekStartDate,
      );
      res.status(200).json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  };

  getFrozenEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employees = await this.managerService.getFrozenEmployees(getAuthenticatedUser(req).userId);
      res.status(200).json({ success: true, data: employees });
    } catch (err) {
      next(err);
    }
  };

  restoreTimesheetAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.managerService.restoreTimesheetAccess(
        getAuthenticatedUser(req).userId,
        parseRouteId(req.params.id, 'employee ID'),
      );
      res.status(200).json({ success: true, message: 'Timesheet access restored.' });
    } catch (err) {
      next(err);
    }
  };

  aiSkillMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId, requirement } = req.body as SkillMatchRequestDto;
      const data = await this.managerService.performSkillMatch(
        getAuthenticatedUser(req).userId,
        projectId,
        requirement,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  aiRiskSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.body as RiskSummaryRequestDto;
      const summary = await this.managerService.performRiskSummary(
        getAuthenticatedUser(req).userId,
        projectId,
      );
      res.status(200).json({ success: true, data: { summary } });
    } catch (err) {
      next(err);
    }
  };

  aiTeamBuild = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requirement } = req.body as TeamBuildRequestDto;
      const data = await this.managerService.performTeamBuild(
        getAuthenticatedUser(req).userId,
        requirement,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
