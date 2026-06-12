import { AppError } from '../errors/AppError';

/** Parses a positive integer route param; rejects missing or non-numeric values. */
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
