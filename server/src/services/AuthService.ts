import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  BCRYPT_SALT_ROUNDS,
  JWT_EXPIRY,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
} from '../constants';
import { AuthResponseDto, LoginDto } from '../dtos/auth.dto';
import { AppError } from '../errors/AppError';
import { User } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { Role } from '../types/enums';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async authenticate(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.findActiveUserOrThrow(dto.username);
    await this.verifyPassword(dto.password, user.passwordHash);

    const token = this.generateToken(user.id, user.role);

    return {
      token,
      role: user.role,
      userId: user.id,
      fullName: user.fullName,
      forcePasswordChange: user.forcePasswordChange,
    };
  }

  async changePassword(userId: number, newPassword: string, confirmPassword: string): Promise<void> {
    this.checkPasswordsMatch(newPassword, confirmPassword);
    this.checkPasswordMeetsStrength(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.updatePassword(userId, passwordHash);
  }

  async hashPassword(plainPassword: string): Promise<string> {
    this.checkPasswordMeetsStrength(plainPassword);
    return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
  }

  private async findActiveUserOrThrow(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw AppError.unauthorized('Invalid username or password.');
    }
    if (!user.isActive) {
      throw AppError.unauthorized('This account has been deactivated. Contact Admin.');
    }
    return user;
  }

  private async verifyPassword(plainPassword: string, passwordHash: string): Promise<void> {
    const isPasswordCorrect = await bcrypt.compare(plainPassword, passwordHash);
    if (!isPasswordCorrect) {
      throw AppError.unauthorized('Invalid username or password.');
    }
  }

  private generateToken(userId: number, role: Role): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');
    return jwt.sign({ userId, role }, secret, { expiresIn: JWT_EXPIRY });
  }

  private checkPasswordsMatch(newPassword: string, confirmPassword: string): void {
    if (newPassword !== confirmPassword) {
      throw AppError.badRequest('Passwords do not match.');
    }
  }

  private checkPasswordMeetsStrength(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_REGEX.test(password)) {
      throw AppError.badRequest(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters, include one uppercase letter and one number.`,
      );
    }
  }
}
