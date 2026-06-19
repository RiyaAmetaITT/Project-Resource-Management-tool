import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from './EmailService';
import { ManagerService } from './ManagerService';
import { Project } from '../models/Project';
import { Milestone } from '../models/Milestone';
import { SkillMatchResultDto } from '../dtos/manager.dto';
import { HealthStatus, HealthFlag } from '../types/enums';
import { formatDate } from '../utils/dateUtils';
import { User } from '../models/User';

export class ProjectHealthNotificationService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly managerService: ManagerService,
  ) {}

  async notifyAtRisk(projectId: number, healthStatus: HealthStatus): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) return;

    const manager = await this.userRepository.findById(project.managerId);
    if (!manager?.email) return;

    const milestones = await this.milestoneRepository.findByProjectId(projectId);
    const riskSummary = await this.managerService.buildRiskSummaryForProject(projectId);
    const suggestions = await this.managerService.findRiskReductionCandidates(projectId);

    const text = this.buildEmailBody(
      project,
      manager,
      milestones,
      healthStatus,
      riskSummary,
      suggestions,
    );
    await this.emailService.send({
      to: [manager.email],
      subject: `Project at risk: ${project.name}`,
      text,
    });
  }

  private buildEmailBody(
    project: Project,
    manager: User,
    milestones: Milestone[],
    healthStatus: HealthStatus,
    riskSummary: string,
    suggestions: SkillMatchResultDto[],
  ): string {
    const lines = [
      `Hi ${manager.fullName},`,
      '',
      `Your project "${project.name}" has been marked AT RISK by the PRM health scheduler.`,
      '',
      '── Project Details ──',
      `  Project : ${project.name}`,
      `  Manager : ${manager.fullName}`,
      '',
      '  Key milestones at a glance:',
      this.formatMilestonesAtAGlance(milestones),
      '',
      '── Health Status ──',
      `  ${this.formatHealthStatus(healthStatus)}`,
      '',
      '── AI Risk Summary ──',
      riskSummary,
      '',
      '  Note: This summary is AI-generated from milestone and timesheet data.',
      '',
      '── Suggested Help ──',
      this.formatSuggestedHelp(suggestions),
      '',
      'Log in to the PRM Tool to review project details and take action.',
      '',
      '— PRM Tool',
    ];

    return lines.join('\n');
  }

  private formatHealthStatus(status: HealthStatus): string {
    switch (status) {
      case HealthStatus.ON_TRACK:
        return 'Green — ON TRACK';
      case HealthStatus.ATTENTION:
        return 'Amber — ATTENTION';
      case HealthStatus.AT_RISK:
        return 'Red — AT RISK';
    }
  }

  private formatMilestonesAtAGlance(milestones: Milestone[]): string {
    if (milestones.length === 0) return '  (No milestones defined)';

    return milestones
      .map((m) => {
        const due = formatDate(new Date(m.dueDate));
        const overdue = m.healthFlag === HealthFlag.OVERDUE ? ' — OVERDUE' : '';
        return `  • ${m.title} — due ${due} — ${m.status}${overdue}`;
      })
      .join('\n');
  }

  private formatSuggestedHelp(suggestions: SkillMatchResultDto[]): string {
    if (suggestions.length === 0) {
      return '  No available employees with matching skills were found at this time.';
    }

    return suggestions
      .map((s, index) => {
        const skills = s.skillsMatch ? ` — skills: ${s.skillsMatch}` : '';
        const availability = s.availability ? ` — ${s.availability}` : '';
        return `  ${index + 1}. ${s.name}${skills}${availability}\n     ${s.reason}`;
      })
      .join('\n');
  }
}
