import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { EmployeeController } from '../controllers/EmployeeController';
import { TimesheetService } from '../services/TimesheetService';
import { AllocationService } from '../services/AllocationService';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';

const router = Router();
const employeeOnly = requireRole(Role.EMPLOYEE);

// Composition root
const timesheetRepo = new TimesheetRepository();
const entryRepo = new TimesheetEntryRepository();
const tagRepo = new ActivityTagRepository();
const allocationRepo = new AllocationRepository();
const employeeRepo = new EmployeeRepository();
const projectRepo = new ProjectRepository();
const configRepo = new SystemConfigRepository();

const timesheetService = new TimesheetService(timesheetRepo, entryRepo, tagRepo, allocationRepo, employeeRepo, projectRepo, configRepo);
const allocationService = new AllocationService(allocationRepo, employeeRepo, projectRepo);

const ctrl = new EmployeeController(timesheetService, allocationService, employeeRepo);

router.post('/timesheets', employeeOnly, ctrl.submitTimesheet);
router.get('/timesheets', employeeOnly, ctrl.getMyTimesheets);
router.get('/timesheets/missed-check', employeeOnly, ctrl.checkMissedTimesheet);
router.get('/allocations', employeeOnly, ctrl.getMyAllocations);

export default router;
