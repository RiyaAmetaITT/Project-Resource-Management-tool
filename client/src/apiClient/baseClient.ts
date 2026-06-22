import axios, { AxiosInstance, AxiosError } from 'axios';
import dotenv from 'dotenv';
import { ApiError } from './apiError';
import { getToken, isLoggedIn } from '../utils/session';

import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true });

export const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';
export const DEFAULT_API_TIMEOUT_MS = 15_000;
export const AI_API_TIMEOUT_MS = 120_000;

const apiClient: AxiosInstance = axios.create({
  baseURL: SERVER_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: DEFAULT_API_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  if (isLoggedIn()) {
    config.headers.Authorization = `Bearer ${getToken()}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new Error('Request timed out. AI calls can take up to 2 minutes — please try again.'),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new Error(`Cannot reach server at ${SERVER_URL}. Check that the server is running.`),
      );
    }

    const serverMessage = error.response.data?.message;
    const httpStatus = error.response.status;
    const message = serverMessage ?? `HTTP ${httpStatus} error`;
    return Promise.reject(new ApiError(message, httpStatus));
  },
);

export default apiClient;
