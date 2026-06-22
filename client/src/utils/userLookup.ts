import { adminApi } from '../apiClient/adminApi';
import { UserSummary } from '../types/admin';
import { promptText } from './inputHelpers';

export async function promptUserLookup(message: string): Promise<UserSummary | null> {
  const input = await promptText(message);
  if (!input) return null;

  const users = await adminApi.getAllUsers();
  const numericId = Number(input);

  if (!Number.isNaN(numericId)) {
    const byId = users.find((user) => user.id === numericId);
    if (byId) return byId;
  }

  const byUsername = users.find((user) => user.username.toLowerCase() === input.toLowerCase());
  return byUsername ?? null;
}
