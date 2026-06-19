import { AllocationService } from '../services/AllocationService';
import { TimesheetService } from '../services/TimesheetService';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { ManagerService } from '../services/ManagerService';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';

export function createManagerService(): ManagerService {
  const allocationRepository = new AllocationRepository();
  const resourceRepository = new ResourceRepository();
  const resourceSkillRepository = new ResourceSkillRepository();
  const activityTagRepository = new ActivityTagRepository();
  const projectRepository = new ProjectRepository();
  const milestoneRepository = new MilestoneRepository();
  const timesheetRepository = new TimesheetRepository();
  const timesheetEntryRepository = new TimesheetEntryRepository();
  const configRepository = new SystemConfigRepository();

  const allocationService = new AllocationService(
    allocationRepository,
    resourceRepository,
    projectRepository,
  );
  const timesheetService = new TimesheetService(
    timesheetRepository,
    timesheetEntryRepository,
    activityTagRepository,
    allocationRepository,
    resourceRepository,
    projectRepository,
    configRepository,
  );
  const aiServiceFactory = new AIServiceFactory(configRepository);

  return new ManagerService(
    allocationService,
    timesheetService,
    aiServiceFactory,
    resourceRepository,
    resourceSkillRepository,
    activityTagRepository,
    projectRepository,
    milestoneRepository,
    configRepository,
  );
}
