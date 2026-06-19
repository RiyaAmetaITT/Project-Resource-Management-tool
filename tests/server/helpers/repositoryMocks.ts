import { User } from '../../../server/src/models/User';
import { ResourceProfile } from '../../../server/src/models/Resource';
import { Project } from '../../../server/src/models/Project';
import { Allocation } from '../../../server/src/models/Allocation';
import { SystemConfig } from '../../../server/src/models/SystemConfig';
import { Role, ResourceStatus, ProjectStatus, LlmProvider } from '../../../server/src/types/enums';
import {
  DEFAULT_MAX_WEEKLY_HOURS,
  DEFAULT_SCHEDULER_INTERVAL_HRS,
  DEFAULT_LLM_MODEL,
} from '../../../server/src/constants';

/** Creates a jest mock object where every method is jest.fn(). */
export function createMockRepo<T extends object>(): jest.Mocked<T> {
  return new Proxy({} as jest.Mocked<T>, {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      if (!(prop in _target)) {
        (_target as Record<string, jest.Mock>)[prop] = jest.fn();
      }
      return (_target as Record<string, jest.Mock>)[prop];
    },
  });
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    roleId: 3,
    role: Role.EMPLOYEE,
    managerId: 10,
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: '$2a$12$hashedpasswordplaceholder',
    department: 'Engineering',
    designation: 'Developer',
    forcePasswordChange: false,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeResourceProfile(overrides: Partial<ResourceProfile> = {}): ResourceProfile {
  return {
    id: 1,
    userId: 2,
    managerId: 10,
    fullName: 'Jane Employee',
    email: 'jane@example.com',
    department: 'Engineering',
    designation: 'Developer',
    status: ResourceStatus.BENCH,
    totalUtilisation: 0,
    timesheetAccessFrozen: false,
    timesheetFrozenWeekStart: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

/** @deprecated Use makeResourceProfile */
export const makeEmployee = makeResourceProfile;

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    totalStoryPoints: 100,
    status: ProjectStatus.ACTIVE,
    managerId: 10,
    healthStatus: 'ON_TRACK' as Project['healthStatus'],
    atRiskNotifiedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    id: 1,
    resourceId: 1,
    projectId: 1,
    utilisationPercent: 50,
    fromDate: new Date('2025-01-01'),
    toDate: new Date('2025-12-31'),
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeSystemConfig(overrides: Partial<SystemConfig> = {}): SystemConfig {
  return {
    id: 1,
    maxWeeklyHours: DEFAULT_MAX_WEEKLY_HOURS,
    schedulerIntervalHrs: DEFAULT_SCHEDULER_INTERVAL_HRS,
    llmProvider: LlmProvider.GEMMA,
    llmHost: 'https://api.example.com/v1',
    llmModel: DEFAULT_LLM_MODEL,
    llmApiKey: 'test-api-key',
    ...overrides,
  };
}
