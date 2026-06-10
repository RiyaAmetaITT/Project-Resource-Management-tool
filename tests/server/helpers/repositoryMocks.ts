import { User } from '../../../server/src/models/User';
import { Employee } from '../../../server/src/models/Employee';
import { Project } from '../../../server/src/models/Project';
import { Allocation } from '../../../server/src/models/Allocation';
import { SystemConfig } from '../../../server/src/models/SystemConfig';
import { Role, EmployeeStatus, ProjectStatus, LlmProvider } from '../../../server/src/types/enums';
import { DEFAULT_MAX_WEEKLY_HOURS, DEFAULT_SCHEDULER_INTERVAL_HRS } from '../../../server/src/constants';

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
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: '$2a$12$hashedpasswordplaceholder',
    role: Role.EMPLOYEE,
    forcePasswordChange: false,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    userId: 2,
    managerId: 10,
    name: 'Jane Employee',
    email: 'jane@example.com',
    department: 'Engineering',
    designation: 'Developer',
    status: EmployeeStatus.BENCH,
    totalUtilisation: 0,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

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
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    id: 1,
    employeeId: 1,
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
    llmProvider: LlmProvider.GEMINI,
    llmApiKey: 'test-api-key',
    ...overrides,
  };
}
