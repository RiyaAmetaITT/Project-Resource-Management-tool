import { Permission as PermissionCode } from '../types/enums';

export interface PermissionRecord {
  id: number;
  code: PermissionCode;
  description: string;
}
