import axios from 'axios';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    ? '/api/v1'
    : 'http://localhost:5000/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errData = error.response?.data;
    let message = 'An unexpected error occurred';

    if (typeof errData?.error === 'string') {
      message = errData.error;
    } else if (typeof errData?.message === 'string') {
      message = errData.message;
    } else if (typeof errData?.error?.message === 'string') {
      message = errData.error.message;
    } else if (typeof error.message === 'string') {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);
