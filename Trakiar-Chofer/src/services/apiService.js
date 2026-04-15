import axios from 'axios';
import { API_BASE_URL, SERVER_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkServer = async () => {
  const response = await axios.get(`${SERVER_BASE_URL}/`);
  return response.data;
};

export const loginUser = async ({ correo, password }) => {
  const response = await api.post('/login', { correo, password });
  return response.data;
};

const authHeaders = (token) => ({
  headers: {
    Authorization: token,
  },
});

export const getDriverProfile = async (token) => {
  const response = await api.get('/driver-profile', authHeaders(token));
  return response.data;
};

export const getDriverRoutes = async (token) => {
  const response = await api.get('/driver-routes', authHeaders(token));
  return response.data;
};

export const registerDriverLocation = async (token, payload) => {
  const response = await api.post('/driver-location', payload, authHeaders(token));
  return response.data;
};

export const registerDriverLocationsBatch = async (token, payload) => {
  const response = await api.post('/driver-locations-batch', payload, authHeaders(token));
  return response.data;
};
