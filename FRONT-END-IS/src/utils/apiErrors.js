/**
 * Normaliza errores NestJS (HttpExceptionFilter) y ValidationPipe.
 * Formato backend: { status, error, details, path, timestamp }
 */
export function formatApiError(error) {
  if (!error) return 'Ocurrió un error inesperado.';

  const data = error.response?.data;
  if (data) {
    const details = data.details ?? data.detail ?? data.message;
    if (Array.isArray(details)) {
      return details.map(String).join(' · ');
    }
    if (typeof details === 'string' && details.trim()) {
      return details;
    }
    if (typeof details === 'object' && details !== null) {
      if (Array.isArray(details.message)) {
        return details.message.map(String).join(' · ');
      }
      if (details.message) return String(details.message);
    }
    if (data.error && data.status) {
      return `Error ${data.status}: ${data.error}`;
    }
  }

  if (error.code === 'ERR_NETWORK') {
    return 'No hay conexión con el servidor. Revisa que la API esté activa y CORS (o usa el proxy de Vite en desarrollo).';
  }

  if (error.message && error.message !== 'Network Error') {
    return error.message;
  }

  return 'No pudimos completar la operación. Intenta de nuevo.';
}
