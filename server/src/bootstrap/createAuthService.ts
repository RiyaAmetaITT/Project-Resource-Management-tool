import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';

export function createAuthService(): AuthService {
  return new AuthService(new UserRepository());
}
