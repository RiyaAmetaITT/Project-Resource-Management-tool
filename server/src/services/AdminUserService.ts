import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { AuthService } from './AuthService';
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { Role } from '../types/enums';

export class AdminUserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly authService: AuthService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertUsernameIsUnique(dto.username);
    await this.assertEmailIsUnique(dto.email);

    const roleRecord = await this.roleRepository.findByName(dto.role);
    if (!roleRecord) throw AppError.badRequest(`Invalid role: ${dto.role}`);

    const passwordHash = await this.authService.hashPassword(dto.temporaryPassword);

    const user = await this.userRepository.save({
      roleId: roleRecord.id,
      fullName: dto.fullName,
      email: dto.email,
      username: dto.username,
      passwordHash,
      forcePasswordChange: true,
      isActive: true,
      department: dto.role === Role.ADMIN ? null : 'Unassigned',
      designation: dto.role === Role.ADMIN ? null : 'Unassigned',
    });

    if (dto.role === Role.EMPLOYEE || dto.role === Role.MANAGER) {
      await this.resourceRepository.save({ userId: user.id });
    }

    return this.toUserResponse(user);
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((u) => this.toUserResponse(u));
  }

  async resetPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound(`User ${userId} not found.`);

    const passwordHash = await this.authService.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, passwordHash, true);
  }

  async deactivateUser(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound(`User ${userId} not found.`);
    await this.userRepository.setActiveStatus(userId, false);
  }

  async reactivateUser(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound(`User ${userId} not found.`);
    await this.userRepository.setActiveStatus(userId, true);
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }

  private async assertUsernameIsUnique(username: string): Promise<void> {
    const existing = await this.userRepository.findByUsername(username);
    if (existing) throw AppError.conflict(`Username '${username}' is already taken.`);
  }

  private async assertEmailIsUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw AppError.conflict(`Email '${email}' is already registered.`);
  }
}
