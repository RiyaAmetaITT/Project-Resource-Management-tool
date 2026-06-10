import { Role } from '../types/enums';

export interface CreateUserDto {
  fullName: string;
  email: string;
  username: string;
  temporaryPassword: string;
  role: Role;
}

export interface ResetPasswordDto {
  newPassword: string;
}

export interface UserResponseDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}
