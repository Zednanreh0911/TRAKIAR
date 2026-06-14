import axios from 'axios';
import { API_BASE_URL, SERVER_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ETA_REQUEST_TIMEOUT_MS = 30000;

export const checkServer = async () => {
  const response = await axios.get(`${SERVER_BASE_URL}/`);
  return response.data;
};

export const registerUser = async ({ nombre, correo, password, tipoLinea }) => {
  const response = await api.post('/register', { nombre, correo, password, tipoLinea });
  return response.data;
};

export const loginUser = async ({ correo, password }) => {
  const response = await api.post('/login', { correo, password });
  return response.data;
};

export const googleLogin = async ({ id_token }) => {
  const response = await api.post('/google-login', { id_token });
  return response.data;
};

export const updateMyProfile = async (token, payload) => {
  const response = await api.put('/me/profile', payload, authHeaders(token));
  return response.data;
};

export const changeMyPassword = async (token, payload) => {
  const response = await api.put('/me/password', payload, authHeaders(token));
  return response.data;
};

export const toggleMyStatus = async (token) => {
  const response = await api.put('/me/status/toggle', {}, authHeaders(token));
  return response.data;
};

export const requestPasswordReset = async ({ correo }) => {
  const response = await api.post('/password-reset/request', { correo });
  return response.data;
};

export const confirmPasswordReset = async ({ correo, codigo, nuevaPassword }) => {
  const response = await api.post('/password-reset/confirm', { correo, codigo, nuevaPassword });
  return response.data;
};

export const getProtectedData = async (token) => {
  const response = await api.get('/protected', {
    headers: {
      Authorization: token,
    },
  });
  return response.data;
};

const authHeaders = (token) => ({
  headers: {
    Authorization: token,
  },
});

export const promoteToDriver = async (token, payload) => {
  const response = await api.post('/promote-to-driver', payload, authHeaders(token));
  return response.data;
};

export const demoteDriver = async (token, payload) => {
  const response = await api.post('/demote-driver', payload, authHeaders(token));
  return response.data;
};

export const createUnit = async (token, payload) => {
  const response = await api.post('/create-unit', payload, authHeaders(token));
  return response.data;
};

export const getUnitsByLine = async (token) => {
  const response = await api.get('/units-by-line', {
    ...authHeaders(token),
  });
  return response.data;
};

export const assignUnit = async (token, payload) => {
  const response = await api.post('/assign-unit', payload, authHeaders(token));
  return response.data;
};

export const updateUnitDriver = async (token, payload) => {
  const response = await api.put('/update-unit-driver', payload, authHeaders(token));
  return response.data;
};

export const updateUnitStatus = async (token, payload) => {
  const response = await api.put('/update-unit-status', payload, authHeaders(token));
  return response.data;
};

export const deleteUnit = async (token, idUnidad) => {
  const response = await api.delete(`/delete-unit/${idUnidad}`, authHeaders(token));
  return response.data;
};

export const addRoute = async (token, payload) => {
  const response = await api.post('/add-route', payload, authHeaders(token));
  return response.data;
};

export const getRoutesByLine = async (token) => {
  const response = await api.get('/routes-by-line', authHeaders(token));
  return response.data;
};

export const searchRoutes = async (token, query) => {
  const response = await api.get('/search-routes', {
    ...authHeaders(token),
    params: {
      q: query,
    },
  });
  return response.data;
};

export const getRoutesCatalog = async (token) => {
  const response = await api.get('/routes-catalog', authHeaders(token));
  return response.data;
};

export const getManagerStats = async (token) => {
  const response = await api.get('/manager-stats', authHeaders(token));
  return response.data;
};

export const estimateRouteEta = async (token, idRuta, params) => {
  const response = await api.get(`/routes/${idRuta}/eta`, {
    ...authHeaders(token),
    params,
    timeout: ETA_REQUEST_TIMEOUT_MS,
  });

  return response.data;
};

export const editRoute = async (token, idRuta, payload) => {
  const response = await api.put(`/edit-route/${idRuta}`, payload, authHeaders(token));
  return response.data;
};

export const deleteRoute = async (token, idRuta) => {
  const response = await api.delete(`/delete-route/${idRuta}`, authHeaders(token));
  return response.data;
};
