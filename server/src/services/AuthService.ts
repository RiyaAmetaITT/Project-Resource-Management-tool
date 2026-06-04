import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { AuthResponseDto, LoginDto } from '../dtos/auth.dto';
import { AppError } from '../errors/AppError';
import { BCRYPT_SALT_ROUNDS, JWT_EXPIRY, PASSWORD_MIN_LENGTH } from '../constants';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async authenticate(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByUsername(dto.username);
    this.assertUserExists(user);

    const isPasswordCorrect = await bcrypt.compare(dto.password, user!.passwordHash);
    if (!isPasswordCorrect) {
      throw AppError.unauthorized('Invalid username or password.');
    }

    if (!user!.isActive) {
      throw AppError.unauthorized('This account has been deactivated. Contact Admin.');
    }

    const token = this.generateToken(user!.id, user!.role);

    return {
      token,
      role: user!.role,
      userId: user!.id,
      fullName: user!.fullName,
      forcePasswordChange: user!.forcePasswordChange,
    };
  }

  async changePassword(userId: number, newPassword: string, confirmPassword: string): Promise<void> {
    this.assertPasswordsMatch(newPassword, confirmPassword);
    this.assertPasswordMeetsStrength(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.updatePassword(userId, passwordHash);
  }

  async hashPassword(plainPassword: string): Promise<string> {
    this.assertPasswordMeetsStrength(plainPassword);
    return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
  }

  private generateToken(userId: number, role: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');
    return jwt.sign({ userId, role }, secret, { expiresIn: JWT_EXPIRY });
  }

  private assertUserExists(user: unknown): void {
    if (!user) throw AppError.unauthorized('Invalid username or password.');
  }

  private assertPasswordsMatch(newPassword: string, confirmPassword: string): void {
    if (newPassword !== confirmPassword) {
      throw AppError.badRequest('Passwords do not match.');
    }
  }

  private assertPasswordMeetsStrength(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_REGEX.test(password)) {
      throw AppError.badRequest(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters, include one uppercase letter and one number.`,
      );
    }
  }
}
