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

export function createEmployeeService(): EmployeeService {
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
  const allocationService = new AllocationService(
    allocationRepository,
    resourceRepository,
    projectRepository,
  );

  return new EmployeeService(timesheetService, allocationService, resourceRepository);
}
