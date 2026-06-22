import { Role } from '../types/enums';

export interface SessionUser {
  token: string;
  userId: number;
  role: Role;
  fullName: string;
}

let currentUser: SessionUser | null = null;

export function setSession(user: SessionUser): void {
  currentUser = user;
}

export function getSession(): SessionUser {
  if (!currentUser) throw new Error('No active session. Please log in.');
  return currentUser;
}

export function clearSession(): void {
  currentUser = null;
}

export function isLoggedIn(): boolean {
  return currentUser !== null;
}

export function getToken(): string {
  return getSession().token;
}
