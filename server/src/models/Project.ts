import { ProjectStatus, HealthStatus } from '../types/enums';

export interface Project {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  totalStoryPoints: number;
  status: ProjectStatus;
  healthStatus: HealthStatus;
  managerId: number;
  createdAt: Date;
}
