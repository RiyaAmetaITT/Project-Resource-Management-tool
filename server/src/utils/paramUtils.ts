import { AppError } from '../errors/AppError';

export function parseRouteId(value: string, label = 'ID'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest(`Invalid ${label}.`);
  }
  return id;
}

export function parseQueryId(value: unknown, label = 'ID'): number {
  if (typeof value !== 'string' || !value.trim()) {
    throw AppError.badRequest(`Missing ${label}.`);
  }
  return parseRouteId(value, label);
}
