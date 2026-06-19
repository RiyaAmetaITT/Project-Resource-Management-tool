import { ProjectHealthNotificationService } from '../../../../server/src/services/ProjectHealthNotificationService';
import { ProjectRepository } from '../../../../server/src/repositories/ProjectRepository';
import { MilestoneRepository } from '../../../../server/src/repositories/MilestoneRepository';
import { UserRepository } from '../../../../server/src/repositories/UserRepository';
import { EmailService } from '../../../../server/src/services/EmailService';
import { ManagerService } from '../../../../server/src/services/ManagerService';
import {
  createMockRepo,
  makeProject,
  makeUser,
} from '../../helpers/repositoryMocks';
import { HealthStatus, HealthFlag, MilestoneStatus, Role } from '../../../../server/src/types/enums';

describe('ProjectHealthNotificationService', () => {
  let projectRepo: jest.Mocked<ProjectRepository>;
  let milestoneRepo: jest.Mocked<MilestoneRepository>;
  let userRepo: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;
  let managerService: jest.Mocked<ManagerService>;
  let service: ProjectHealthNotificationService;

  beforeEach(() => {
    projectRepo = createMockRepo<ProjectRepository>();
    milestoneRepo = createMockRepo<MilestoneRepository>();
    userRepo = createMockRepo<UserRepository>();
    emailService = createMockRepo<EmailService>();
    managerService = createMockRepo<ManagerService>();
    service = new ProjectHealthNotificationService(
      projectRepo,
      milestoneRepo,
      userRepo,
      emailService,
      managerService,
    );
  });

  it('sends an at-risk email to the project manager with required sections', async () => {
    const project = makeProject({ id: 1, name: 'Alpha Portal', managerId: 10 });
    const manager = makeUser({
      id: 10,
      role: Role.MANAGER,
      fullName: 'Priya Manager',
      email: 'priya@example.com',
    });

    projectRepo.findById.mockResolvedValue(project);
    userRepo.findById.mockResolvedValue(manager);
    milestoneRepo.findByProjectId.mockResolvedValue([
      {
        id: 1,
        projectId: 1,
        title: 'Backend API',
        dueDate: new Date('2026-04-15'),
        storyPoints: 20,
        status: MilestoneStatus.IN_PROGRESS,
        healthFlag: HealthFlag.OVERDUE,
      },
    ] as never);
    managerService.buildRiskSummaryForProject.mockResolvedValue(
      'The Backend API milestone is overdue and hours logged are below expected levels.',
    );
    managerService.findRiskReductionCandidates.mockResolvedValue([
      {
        employeeId: 5,
        name: 'Neha Joshi',
        reason: 'Strong backend skills and 50% availability.',
        skillsMatch: 'Java, Spring',
        availability: '50% free',
      },
    ]);

    await service.notifyAtRisk(1, HealthStatus.AT_RISK);

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['priya@example.com'],
        subject: 'Project at risk: Alpha Portal',
        text: expect.stringContaining('Alpha Portal'),
      }),
    );

    const emailBody = emailService.send.mock.calls[0][0].text;
    expect(emailBody).toContain('Priya Manager');
    expect(emailBody).toContain('Backend API');
    expect(emailBody).toContain('Red — AT RISK');
    expect(emailBody).toContain('AI Risk Summary');
    expect(emailBody).toContain('The Backend API milestone is overdue');
    expect(emailBody).toContain('Suggested Help');
    expect(emailBody).toContain('Neha Joshi');
  });

  it('skips email when manager has no email address', async () => {
    projectRepo.findById.mockResolvedValue(makeProject({ managerId: 10 }));
    userRepo.findById.mockResolvedValue(makeUser({ id: 10, email: '' }));

    await service.notifyAtRisk(1, HealthStatus.AT_RISK);

    expect(emailService.send).not.toHaveBeenCalled();
    expect(managerService.buildRiskSummaryForProject).not.toHaveBeenCalled();
  });

  it('skips email when project is not found', async () => {
    projectRepo.findById.mockResolvedValue(null);

    await service.notifyAtRisk(99, HealthStatus.AT_RISK);

    expect(emailService.send).not.toHaveBeenCalled();
  });
});
