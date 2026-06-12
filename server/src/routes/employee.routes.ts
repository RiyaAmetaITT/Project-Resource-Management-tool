import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { EmployeeController } from '../controllers/EmployeeController';
import { EmployeeService } from '../services/EmployeeService';
import { TimesheetService } from '../services/TimesheetService';
import { AllocationService } from '../services/AllocationService';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';

const router = Router();
const employeeOnly = requireRole(Role.EMPLOYEE);

const timesheetRepository = new TimesheetRepository();
const entryRepository = new TimesheetEntryRepository();
const tagRepository = new ActivityTagRepository();
const allocationRepository = new AllocationRepository();
const resourceRepository = new ResourceRepository();
const projectRepository = new ProjectRepository();
const configRepository = new SystemConfigRepository();

const timesheetService = new TimesheetService(
  timesheetRepository,
  entryRepository,
  tagRepository,
  allocationRepository,
  resourceRepository,
  projectRepository,
  configRepository,
);
const allocationService = new AllocationService(allocationRepository, resourceRepository, projectRepository);
const employeeService = new EmployeeService(timesheetService, allocationService, resourceRepository);

const controller = new EmployeeController(employeeService);

router.post('/timesheets', employeeOnly, controller.submitTimesheet);
router.get('/timesheets', employeeOnly, controller.getMyTimesheets);
router.get('/timesheets/detail', employeeOnly, controller.getTimesheetWeekDetail);
router.get('/timesheets/submit-context', employeeOnly, controller.getSubmitContext);
router.get('/timesheets/missed-check', employeeOnly, controller.checkMissedTimesheet);
router.get('/allocations', employeeOnly, controller.getMyAllocations);

export default router;
