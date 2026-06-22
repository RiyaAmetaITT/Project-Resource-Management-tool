import { Response, NextFunction } from 'express';
import { EmployeeService } from '../services/EmployeeService';
import { AuthenticatedRequest, getAuthenticatedUser } from '../middleware/authMiddleware';
import { SubmitTimesheetDto } from '../dtos/timesheet.dto';
import { resolveWeekStartDate } from '../utils/dateUtils';

export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  submitTimesheet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.employeeService.submitTimesheet(
        getAuthenticatedUser(req).userId,
        req.body as SubmitTimesheetDto,
      );
      res.status(201).json({ success: true, message: 'Timesheet submitted successfully.' });
    } catch (err) {
      next(err);
    }
  };

  getMyTimesheets = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timesheets = await this.employeeService.getMyTimesheets(getAuthenticatedUser(req).userId);
      res.status(200).json({ success: true, data: timesheets });
    } catch (err) {
      next(err);
    }
  };

  getTimesheetWeekDetail = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const weekStartDate = resolveWeekStartDate(req.query.week);
      const detail = await this.employeeService.getTimesheetWeekDetail(
        getAuthenticatedUser(req).userId,
        weekStartDate,
      );
      res.status(200).json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  };

  getSubmitContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const weekStartDate = resolveWeekStartDate(req.query.week);
      const context = await this.employeeService.getSubmitContext(
        getAuthenticatedUser(req).userId,
        weekStartDate,
      );
      res.status(200).json({ success: true, data: context });
    } catch (err) {
      next(err);
    }
  };

  getMyAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allocations = await this.employeeService.getMyAllocations(getAuthenticatedUser(req).userId);
      res.status(200).json({ success: true, data: allocations });
    } catch (err) {
      next(err);
    }
  };

  checkMissedTimesheet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const missed = await this.employeeService.checkMissedTimesheet(getAuthenticatedUser(req).userId);
      res.status(200).json({ success: true, data: missed });
    } catch (err) {
      next(err);
    }
  };
}
