import { SchedulerService } from '../services/SchedulerService';
import { TimesheetNotificationService } from '../services/TimesheetNotificationService';
import { ProjectHealthNotificationService } from '../services/ProjectHealthNotificationService';
import { EmailService } from '../services/EmailService';
import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { UserRepository } from '../repositories/UserRepository';
import { createManagerService } from './createManagerService';

export function createSchedulerService(): SchedulerService {
  const allocationRepository = new AllocationRepository();
  const resourceRepository = new ResourceRepository();
  const milestoneRepository = new MilestoneRepository();
  const projectRepository = new ProjectRepository();
  const configRepository = new SystemConfigRepository();
  const timesheetRepository = new TimesheetRepository();
  const timesheetEntryRepository = new TimesheetEntryRepository();
  const userRepository = new UserRepository();
  const emailService = new EmailService();
  const { projectRiskAnalysis } = createManagerService();

  const timesheetNotificationService = new TimesheetNotificationService(
    allocationRepository,
    resourceRepository,
    timesheetRepository,
    userRepository,
    emailService,
  );

  const projectHealthNotificationService = new ProjectHealthNotificationService(
    projectRepository,
    milestoneRepository,
    userRepository,
    emailService,
    projectRiskAnalysis,
  );

  return new SchedulerService(
    allocationRepository,
    resourceRepository,
    milestoneRepository,
    projectRepository,
    configRepository,
    timesheetRepository,
    timesheetEntryRepository,
    timesheetNotificationService,
    projectHealthNotificationService,
  );
}
