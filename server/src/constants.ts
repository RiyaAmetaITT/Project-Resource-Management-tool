export const DEFAULT_MAX_WEEKLY_HOURS = 40;
export const DEFAULT_SCHEDULER_INTERVAL_HRS = 4;
export const DEFAULT_LLM_HOST = 'http://164.52.211.238/api/generate';
export const DEFAULT_LLM_MODEL = 'gemma3:12b-it-q8_0';
export const LLM_FETCH_TIMEOUT_MS = 90_000;
export const TEAM_BUILD_AI_TIMEOUT_MS = 60_000;
export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'Admin@1234';
export const JWT_EXPIRY = '8h';
export const BCRYPT_SALT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
export const SYSTEM_CONFIG_ROW_ID = 1;

export const MAX_UTILISATION_PERCENT = 100;
export const RECENT_ACTIVITY_WEEKS = 4;
export const RECENT_ACTIVITY_DISPLAY_COUNT = 2;
export const LOW_HOURS_THRESHOLD_RATIO = 0.5;
export const HOURS_CRITICAL_THRESHOLD_RATIO = 0.25;
export const MILESTONE_APPROACHING_DAYS = 7;
export const STORY_POINTS_BEHIND_ATTENTION_GAP = 0.2;
export const STORY_POINTS_BEHIND_CRITICAL_GAP = 0.4;
export const DAYS_IN_WEEK = 7;
export const MISSED_TIMESHEET_HISTORY_WEEKS = 12;
export const TIMESHEET_SUBMISSION_DEADLINE_OFFSET_DAYS = 7;

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
