export function getErrorText(error) {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.response?.data) {
    try {
      return JSON.stringify(error.response.data);
    } catch {
      return 'Error en la respuesta del servidor';
    }
  }

  if (error?.message) {
    return error.message;
  }

  return 'Error desconocido';
}
