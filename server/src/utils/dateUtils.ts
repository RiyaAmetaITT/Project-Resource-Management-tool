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

export function resolveWeekStartDate(weekQuery: unknown): Date {
  if (typeof weekQuery === 'string' && weekQuery.trim()) {
    return parseDate(weekQuery);
  }
  return getWeekStartDate();
}

export function getWeekStartDate(date: Date = new Date()): Date {
  const day = date.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1; // Sunday = 0 needs special handling
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function addDays(date: Date, days: number): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getLastCompletedWeekStart(date: Date = new Date()): Date {
  const currentWeekStart = getWeekStartDate(date);
  return addDays(currentWeekStart, -7);
}

export function getTimesheetSubmissionDeadline(weekStart: Date): Date {
  return addDays(weekStart, 7);
}

export function getNextWorkingDay(date: Date): Date {
  let next = addDays(date, 1);
  while (!isWorkingDay(next)) {
    next = addDays(next, 1);
  }
  return next;
}
