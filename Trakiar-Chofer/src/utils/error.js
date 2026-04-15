export const getErrorText = (error, fallback = 'Ocurrió un error inesperado.') => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};
