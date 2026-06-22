import { SkillMatchResultDto } from '../dtos/manager.dto';

export interface IProjectRiskAnalysis {
  buildRiskSummaryForProject(projectId: number): Promise<string>;
  findRiskReductionCandidates(projectId: number): Promise<SkillMatchResultDto[]>;
}
