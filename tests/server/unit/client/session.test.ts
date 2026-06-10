import {
  setSession,
  getSession,
  clearSession,
  isLoggedIn,
  getToken,
} from '../../../../client/src/utils/session';
import { Role } from '../../../../client/src/types/enums';

describe('session (client)', () => {
  afterEach(() => {
    clearSession();
  });

  it('stores and retrieves session', () => {
    setSession({
      token: 'abc',
      userId: 1,
      role: Role.ADMIN,
      fullName: 'Admin',
    });
    expect(isLoggedIn()).toBe(true);
    expect(getSession().fullName).toBe('Admin');
    expect(getToken()).toBe('abc');
  });

  it('clears session on logout', () => {
    setSession({ token: 'x', userId: 1, role: Role.EMPLOYEE, fullName: 'E' });
    clearSession();
    expect(isLoggedIn()).toBe(false);
    expect(() => getSession()).toThrow(/No active session/);
  });
});
