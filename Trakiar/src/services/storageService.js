import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'trakiar_token';
const USER_META_KEY = 'trakiar_user_meta';

export const saveToken = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const saveUserMeta = async (meta) => {
  await AsyncStorage.setItem(USER_META_KEY, JSON.stringify(meta));
};

export const getUserMeta = async () => {
  const raw = await AsyncStorage.getItem(USER_META_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearUserMeta = async () => {
  await AsyncStorage.removeItem(USER_META_KEY);
};
