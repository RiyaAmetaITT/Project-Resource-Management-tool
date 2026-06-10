import { MilestoneStatus, HealthFlag } from '../types/enums';

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  dueDate: Date;
  storyPoints: number;
  status: MilestoneStatus;
  healthFlag: HealthFlag;
}
