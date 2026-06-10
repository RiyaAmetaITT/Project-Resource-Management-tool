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
