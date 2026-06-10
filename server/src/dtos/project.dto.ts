import { ProjectStatus, HealthStatus } from '../types/enums';

export interface CreateProjectDto {
  name: string;
  description: string;
  startDate: string;     // DD-MM-YYYY from console
  endDate: string;       // DD-MM-YYYY from console
  totalStoryPoints?: number;
  status: ProjectStatus;
  managerId: number;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalStoryPoints?: number;
  status?: ProjectStatus;  // Now includes COMPLETED
  managerId?: number;
}

export interface ProjectResponseDto {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  totalStoryPoints: number;
  status: ProjectStatus;
  healthStatus: HealthStatus;
  managerId: number;
}
