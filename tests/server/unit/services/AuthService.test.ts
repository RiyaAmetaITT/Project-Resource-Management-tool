import bcrypt from 'bcryptjs';
import { AuthService } from '../../../../server/src/services/AuthService';
import { UserRepository } from '../../../../server/src/repositories/UserRepository';
import { AppError } from '../../../../server/src/errors/AppError';
import { createMockRepo, makeUser } from '../../helpers/repositoryMocks';
import { Role } from '../../../../server/src/types/enums';

describe('AuthService', () => {
  let userRepo: jest.Mocked<UserRepository>;
  let authService: AuthService;

  beforeEach(() => {
    userRepo = createMockRepo<UserRepository>();
    authService = new AuthService(userRepo);
  });

  describe('authenticate', () => {
    it('returns token and user info on valid credentials', async () => {
      const hash = await bcrypt.hash('ValidPass1', 12);
      const user = makeUser({ passwordHash: hash, role: Role.ADMIN, fullName: 'Admin User' });
      userRepo.findByUsername.mockResolvedValue(user);

      const result = await authService.authenticate({ username: 'testuser', password: 'ValidPass1' });

      expect(result.token).toBeDefined();
      expect(result.role).toBe(Role.ADMIN);
      expect(result.userId).toBe(user.id);
      expect(result.fullName).toBe('Admin User');
    });

    it('throws unauthorized for unknown username', async () => {
      userRepo.findByUsername.mockResolvedValue(null);
      await expect(
        authService.authenticate({ username: 'ghost', password: 'ValidPass1' }),
      ).rejects.toThrow(AppError);
      await expect(
        authService.authenticate({ username: 'ghost', password: 'ValidPass1' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws unauthorized for wrong password', async () => {
      const hash = await bcrypt.hash('ValidPass1', 12);
      userRepo.findByUsername.mockResolvedValue(makeUser({ passwordHash: hash }));
      await expect(
        authService.authenticate({ username: 'testuser', password: 'WrongPass1' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws unauthorized for deactivated account', async () => {
      const hash = await bcrypt.hash('ValidPass1', 12);
      userRepo.findByUsername.mockResolvedValue(makeUser({ passwordHash: hash, isActive: false }));
      await expect(
        authService.authenticate({ username: 'testuser', password: 'ValidPass1' }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: expect.stringContaining('deactivated'),
      });
    });
  });

  describe('changePassword', () => {
    it('updates password when valid and matching', async () => {
      await authService.changePassword(1, 'NewPass1', 'NewPass1');
      expect(userRepo.updatePassword).toHaveBeenCalledWith(1, expect.any(String));
    });

    it('rejects mismatched passwords', async () => {
      await expect(authService.changePassword(1, 'NewPass1', 'OtherPass1')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Passwords do not match.',
      });
    });

    it('rejects weak password', async () => {
      await expect(authService.changePassword(1, 'weak', 'weak')).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('hashPassword', () => {
    it('hashes a valid password', async () => {
      const hash = await authService.hashPassword('StrongPass1');
      expect(hash).toBeDefined();
      expect(await bcrypt.compare('StrongPass1', hash)).toBe(true);
    });

    it('rejects weak password', async () => {
      await expect(authService.hashPassword('short')).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
