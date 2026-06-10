import request from 'supertest';
import { createApp } from '../../../server/src/app';

let appInstance: ReturnType<typeof createApp> | null = null;

export function getTestApp(): ReturnType<typeof createApp> {
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

export function api() {
  return request(getTestApp());
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
