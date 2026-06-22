import { MilestoneStatus } from '../types/enums';

export interface AddMilestoneDto {
  title: string;
  dueDate: string;
  storyPoints?: number;
}

export interface UpdateMilestoneStatusDto {
  status: MilestoneStatus;
}
