import { Response, NextFunction } from 'express';
import { TimesheetService } from '../services/TimesheetService';
import { AllocationService } from '../services/AllocationService';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { SubmitTimesheetDto } from '../dtos/timesheet.dto';
import { AppError } from '../errors/AppError';

export class EmployeeController {
  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly allocationService: AllocationService,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  submitTimesheet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeRepository.findByUserId(req.user!.userId);
      if (!employee) throw AppError.notFound('Employee profile not found for this user.');
      await this.timesheetService.submitTimesheet(employee.id, req.body as SubmitTimesheetDto);
      res.status(201).json({ success: true, message: 'Timesheet submitted successfully.' });
    } catch (err) { next(err); }
  };

  getMyTimesheets = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeRepository.findByUserId(req.user!.userId);
      if (!employee) throw AppError.notFound('Employee profile not found for this user.');
      const timesheets = await this.timesheetService.getMyTimesheets(employee.id);
      res.status(200).json({ success: true, data: timesheets });
    } catch (err) { next(err); }
  };

  getMyAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeRepository.findByUserId(req.user!.userId);
      if (!employee) throw AppError.notFound('Employee profile not found for this user.');
      const allocations = await this.allocationService.getActiveAllocationsForEmployee(employee.id);
      res.status(200).json({ success: true, data: allocations });
    } catch (err) { next(err); }
  };

  checkMissedTimesheet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeRepository.findByUserId(req.user!.userId);
      if (!employee) throw AppError.notFound('Employee profile not found for this user.');
      const missed = await this.timesheetService.hasMissedCurrentWeek(employee.id);
      res.status(200).json({
        success: true,
        data: {
          hasMissedLastWeek: missed.hasMissed,
          missedWeekStartDate: missed.weekStartDate,
        },
      });
    } catch (err) { next(err); }
  };
}
