import { Platform } from "react-native";

const defaultServerByPlatform = {
  android: "http://10.0.2.2:3000",
  ios: "http://localhost:3000",
  default: "http://localhost:3000",
};

const serverBaseUrl =
  process.env.EXPO_PUBLIC_SERVER_URL ||
  defaultServerByPlatform[Platform.OS] ||
  defaultServerByPlatform.default;

export const SERVER_BASE_URL = serverBaseUrl.replace(/\/$/, "");
export const API_BASE_URL = `${SERVER_BASE_URL}/api/users`;
export const WS_BASE_URL = SERVER_BASE_URL.replace(/^http/i, "ws");
