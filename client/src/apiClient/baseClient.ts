import axios, { AxiosInstance, AxiosError } from 'axios';
import dotenv from 'dotenv';
import { getToken, isLoggedIn } from '../utils/session';

import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true });

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';

/**
 * Shared Axios instance.
 * - Automatically attaches the JWT Bearer token if the user is logged in.
 * - Maps server error responses to plain Error messages.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: SERVER_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
    const serverMessage = error.response?.data?.message;
    const httpStatus = error.response?.status;
    const message = serverMessage ?? `HTTP ${httpStatus ?? 'unknown'} error`;
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
