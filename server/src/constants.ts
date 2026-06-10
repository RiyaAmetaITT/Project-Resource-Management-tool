/** Application-wide constants. No magic numbers anywhere else in the codebase. */

export const DEFAULT_MAX_WEEKLY_HOURS = 40;
export const DEFAULT_SCHEDULER_INTERVAL_HRS = 4;
export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'Admin@1234';
export const JWT_EXPIRY = '8h';
export const BCRYPT_SALT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 8;
export const SYSTEM_CONFIG_ROW_ID = 1;

/** Activity tag options shown on the timesheet submission screen (BRD §Screen 5.1). */
export const ACTIVITY_TAG_OPTIONS = [
  'Backend API Development',
  'Microservices / Architecture',
  'Database Design & Queries',
  'WebSocket / Real-time Features',
  'Frontend Development',
  'Code Review / Mentoring',
  'Bug Fixing',
  'DevOps / Deployment',
  'Testing & QA',
  'Documentation',
] as const;
