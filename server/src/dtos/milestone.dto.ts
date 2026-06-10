import { MilestoneStatus } from '../types/enums';

export interface AddMilestoneDto {
  title: string;
  dueDate: string;       // DD-MM-YYYY
  storyPoints?: number;
}

export interface UpdateMilestoneStatusDto {
  status: MilestoneStatus;
}
