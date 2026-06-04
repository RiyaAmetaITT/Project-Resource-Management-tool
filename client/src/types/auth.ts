import { Role } from './enums';

export interface AuthResponseDto {
  token: string;
  role: Role;
  userId: number;
  fullName: string;
  forcePasswordChange: boolean;
}
