import {
  parseDate,
  getWeekStartDate,
  isFutureDate,
  formatDate,
} from '../../../../server/src/utils/dateUtils';

describe('dateUtils', () => {
  describe('parseDate', () => {
    it('parses valid DD-MM-YYYY', () => {
      const date = parseDate('15-06-2025');
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(5);
      expect(date.getFullYear()).toBe(2025);
    });

    it('throws on invalid format', () => {
      expect(() => parseDate('15-06')).toThrow(/Invalid date format/);
    });

    it('throws on invalid date value', () => {
      expect(() => parseDate('31-02-2025')).toThrow(/Invalid date value/);
    });
  });

  describe('getWeekStartDate', () => {
    it('returns Monday for a Wednesday', () => {
      const wed = new Date(2025, 5, 11); // Wed 11 Jun 2025
      const monday = getWeekStartDate(wed);
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(9);
    });

    it('returns previous Monday for Sunday', () => {
      const sun = new Date(2025, 5, 15); // Sun 15 Jun 2025
      const monday = getWeekStartDate(sun);
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(9);
    });

    it('sets time to midnight', () => {
      const monday = getWeekStartDate(new Date(2025, 5, 11));
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
    });
  });

  describe('isFutureDate', () => {
    it('returns true for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      expect(isFutureDate(tomorrow)).toBe(true);
    });

    it('returns false for today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(isFutureDate(today)).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('formats with leading zeros', () => {
      expect(formatDate(new Date(2025, 0, 5))).toBe('05-01-2025');
    });
  });
});
