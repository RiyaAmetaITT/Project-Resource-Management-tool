/** Parses a DD-MM-YYYY string into a JavaScript Date. Throws if format is invalid. */
export function parseDate(ddmmyyyy: string): Date {
  const parts = ddmmyyyy.split('-');
  if (parts.length !== 3) throw new Error(`Invalid date format: '${ddmmyyyy}'. Expected DD-MM-YYYY.`);

  const [day, month, year] = parts.map(Number);
  const date = new Date(year, month - 1, day);

  const isValid =
    !isNaN(date.getTime()) &&
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year;

  if (!isValid) throw new Error(`Invalid date value: '${ddmmyyyy}'.`);
  return date;
}

/** Resolves a week-start date from an optional query value, defaulting to the current week. */
export function resolveWeekStartDate(weekQuery: unknown): Date {
  if (typeof weekQuery === 'string' && weekQuery.trim()) {
    return parseDate(weekQuery);
  }
  return getWeekStartDate();
}

/** Returns the most recent Monday at midnight for a given date. */
export function getWeekStartDate(date: Date = new Date()): Date {
  const day = date.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1; // Sunday = 0 needs special handling
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Returns true if date is strictly in the future compared to today. */
export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/** Formats a Date to DD-MM-YYYY for display in the console client. */
export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Returns a copy of the date at local midnight. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns true for Monday through Friday. */
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** Returns true when both dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Adds calendar days to a date (midnight-normalised). */
export function addDays(date: Date, days: number): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Returns the Monday of the most recently completed work week. */
export function getLastCompletedWeekStart(date: Date = new Date()): Date {
  const currentWeekStart = getWeekStartDate(date);
  return addDays(currentWeekStart, -7);
}

/** Submission deadline for a week that starts on weekStart (Monday following that week). */
export function getTimesheetSubmissionDeadline(weekStart: Date): Date {
  return addDays(weekStart, 7);
}

/** First working day strictly after the given date. */
export function getNextWorkingDay(date: Date): Date {
  let next = addDays(date, 1);
  while (!isWorkingDay(next)) {
    next = addDays(next, 1);
  }
  return next;
}
