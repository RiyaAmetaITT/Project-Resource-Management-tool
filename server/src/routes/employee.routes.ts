import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { Role } from '../types/enums';
import { EmployeeController } from '../controllers/EmployeeController';
import { createEmployeeService } from '../bootstrap/createEmployeeService';

const router = Router();
const employeeOnly = requireRole(Role.EMPLOYEE);
const controller = new EmployeeController(createEmployeeService());

router.post('/timesheets', employeeOnly, controller.submitTimesheet);
router.get('/timesheets', employeeOnly, controller.getMyTimesheets);
router.get('/timesheets/detail', employeeOnly, controller.getTimesheetWeekDetail);
router.get('/timesheets/submit-context', employeeOnly, controller.getSubmitContext);
router.get('/timesheets/missed-check', employeeOnly, controller.checkMissedTimesheet);
router.get('/allocations', employeeOnly, controller.getMyAllocations);

export default router;
