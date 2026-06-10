import { validateDateFormat } from '../../../../client/src/utils/inputHelpers';

describe('validateDateFormat (client)', () => {
  it('accepts empty input', () => {
    expect(validateDateFormat('')).toBe(true);
  });

  it('accepts valid DD-MM-YYYY', () => {
    expect(validateDateFormat('15-06-2025')).toBe(true);
  });

  it('rejects wrong format', () => {
    expect(validateDateFormat('2025-06-15')).toBe('Enter date in DD-MM-YYYY format.');
  });

  it('rejects invalid date', () => {
    expect(validateDateFormat('31-02-2025')).toBe('Invalid date value.');
  });
});
