import { Platform } from 'react-native';

const defaultServerByPlatform = {
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  web: 'http://localhost:3000',
  default: 'http://localhost:3000',
};

const ensureHttpProtocol = (rawUrl) => {
  const value = String(rawUrl || '').trim();

  if (!value) {
    return defaultServerByPlatform.default;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `http://${value}`;
};

const serverBaseUrl =
  ensureHttpProtocol(process.env.EXPO_PUBLIC_SERVER_URL) ||
  defaultServerByPlatform[Platform.OS] ||
  defaultServerByPlatform.default;

export const SERVER_BASE_URL = serverBaseUrl.replace(/\/$/, '');
export const API_BASE_URL = `${SERVER_BASE_URL}/api/users`;

const toWsBaseUrl = (httpBaseUrl) => {
  if (/^https:\/\//i.test(httpBaseUrl)) {
    return httpBaseUrl.replace(/^https/i, 'wss');
  }

  if (/^http:\/\//i.test(httpBaseUrl)) {
    return httpBaseUrl.replace(/^http/i, 'ws');
  }

  return `ws://${httpBaseUrl.replace(/^\/+/, '')}`;
};

export const WS_BASE_URL = toWsBaseUrl(SERVER_BASE_URL);
