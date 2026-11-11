import axios from 'axios';
import { formatApiError } from '../utils/apiErrors';
import { isUuidV4, validateAuthToken } from '../utils/jwt';
import { assertAtraccionIdUuid, buildReservationPayload } from '../utils/reservationPayload';

const TOKEN_KEY = 'token';

/**
 * URL base de la API.
 * - Dev: VITE_API_URL=/api/v2 (proxy de Vite) o http://localhost:3001/api/v2
 * - Prod: definir VITE_API_URL en el build. Sin definir, se usa la URL
 *   relativa /api/v2 (frontend y API tras el mismo proxy/reverse) y se avisa.
 */
const configuredUrl = import.meta.env.VITE_API_URL;
const apiBaseURL =
  configuredUrl || (import.meta.env.PROD ? '/api/v2' : 'http://localhost:3001/api/v2');

if (import.meta.env.PROD && !configuredUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    '[api] VITE_API_URL no definido en el build; se usa la URL relativa /api/v2. ' +
      'Si el frontend y la API están en dominios distintos, defínelo en el build.',
  );
}

// [VULN-02] Clave M2M del backend dentro del frontend: queda en el bundle
// público y se ve en la pestaña Red del navegador.
const BOOKING_API_KEY = 'atr-booking-2026-ecuatravel-key';

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': BOOKING_API_KEY,
  },
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Solo persiste tokens cuyo sub sea UUID v4 (compatible con PostgreSQL). */
export function persistAuthToken(token) {
  const validation = validateAuthToken(token);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  localStorage.setItem(TOKEN_KEY, token.trim());
}

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = formatApiError(error);
    if (error.response?.status === 401) {
      clearStoredToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:session-expired'));
      }
    }
    return Promise.reject(error);
  },
);

export const AtraccionesService = {
  getAll: async (params, customHeaders = {}) => {
    const response = await api.get('/atracciones', { params, headers: customHeaders });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/atracciones/${id}`);
    return response.data;
  },
  checkAvailability: async (id, date) => {
    const response = await api.get(`/atracciones/${id}/availability`, { params: { date } });
    return response.data;
  },

  /**
   * Paso 1 del ciclo transaccional: reserva PENDING + factura.
   * Requiere JWT + Idempotency-Key (UUID v4).
   */
  reserve: async (atraccionId, formValues, idempotencyKey) => {
    assertAtraccionIdUuid(atraccionId);
    if (!isUuidV4(idempotencyKey)) {
      throw new Error('Idempotency-Key interno inválido.');
    }
    const payload = buildReservationPayload(formValues);
    const response = await api.post(`/atracciones/${atraccionId}/reservations`, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  },

  /** Paso 2: confirma pago y marca factura PAID. */
  pay: async (reservationId, paymentBody) => {
    if (!isUuidV4(reservationId)) {
      throw new Error('ID de reserva inválido.');
    }
    const payload = {
      card_token: String(paymentBody.card_token).trim(),
      method: paymentBody.method,
    };
    const response = await api.post(`/atracciones/reservations/${reservationId}/pay`, payload);
    return response.data;
  },

  /** Historial de reservas del usuario (GET /atracciones/reservations). */
  getMyReservations: async () => {
    const response = await api.get('/atracciones/reservations');
    return response.data;
  },
  getReservation: async (reservationId) => {
    if (!isUuidV4(reservationId)) throw new Error('ID de reserva inválido.');
    const response = await api.get(`/atracciones/reservations/${reservationId}`);
    return response.data;
  },
  /** Cancela una reserva. Requiere Idempotency-Key (UUID v4) + motivo. */
  cancelReservation: async (reservationId, reason, idempotencyKey) => {
    if (!isUuidV4(reservationId)) throw new Error('ID de reserva inválido.');
    if (!isUuidV4(idempotencyKey)) throw new Error('Idempotency-Key interno inválido.');
    const response = await api.post(
      `/atracciones/reservations/${reservationId}/cancel`,
      { reason },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  },

  create: async (payload) => {
    const response = await api.post('/atracciones', payload);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.patch(`/atracciones/${id}`, payload);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/atracciones/${id}`);
    return response.data;
  },

  getReviews: async (atraccionId) => {
    const response = await api.get(`/atracciones/${atraccionId}/reviews`);
    return response.data;
  },
  createReview: async (atraccionId, { score, comment }) => {
    const response = await api.post(`/atracciones/${atraccionId}/reviews`, { score, comment });
    return response.data;
  },

  getWishlist: async () => {
    const response = await api.get('/atracciones/users/me/wishlist');
    return response.data;
  },
  addWishlist: async (atraccionId) => {
    const response = await api.post(`/atracciones/users/me/wishlist/${atraccionId}`);
    return response.data;
  },
  removeWishlist: async (atraccionId) => {
    const response = await api.delete(`/atracciones/users/me/wishlist/${atraccionId}`);
    return response.data;
  },
};

export const AuthService = {
  /** Login real contra POST /auth/login -> { access_token, user }. */
  login: async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /** Alta de cuenta (registro) -> mismo shape que login: { access_token, user }. */
  register: async ({ email, password, nombre_completo, dni, telefono }) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      nombre_completo,
      dni,
      telefono: telefono?.trim() || undefined,
    });
    return response.data;
  },
};

const NO_CACHE = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' };

/** Módulo Clientes del panel: turistas con su facturación y reservas. */
export const ClientesService = {
  list: async ({ q, page = 1, limit = 20 } = {}) => {
    const response = await api.get('/admin/clientes', {
      params: { ...(q && { q }), page, limit },
      headers: NO_CACHE,
    });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/admin/clientes/${id}`, { headers: NO_CACHE });
    return response.data;
  },

  create: async (payload) => {
    const response = await api.post('/admin/clientes', payload);
    return response.data;
  },
};

/** Módulo Personal del panel: administradores y operadores. */
export const PersonalService = {
  list: async (q) => {
    const response = await api.get('/admin/personal', { params: q ? { q } : {}, headers: NO_CACHE });
    return response.data;
  },

  create: async (payload) => {
    const response = await api.post('/admin/personal', payload);
    return response.data;
  },

  /** También da acceso de personal a un cliente. */
  setRole: async (id, rol) => {
    const response = await api.patch(`/admin/personal/${id}/rol`, { rol });
    return response.data;
  },

  setActive: async (id, activo) => {
    const response = await api.patch(`/admin/personal/${id}/estado`, { activo });
    return response.data;
  },

  removeAccess: async (id) => {
    await api.delete(`/admin/personal/${id}`);
  },
};

/** Panel del guía o administrador: reservas del día y check-in presencial. */
export const AdminService = {
  /** Sin `q` lista la fecha; con `q` busca por código, cédula o email en todas las fechas. */
  getReservations: async ({ fecha, q } = {}) => {
    const response = await api.get('/admin/reservas', {
      params: q ? { q } : { fecha },
      headers: NO_CACHE,
    });
    return response.data;
  },

  checkin: async (reservationId, body) => {
    const response = await api.post(`/admin/reservas/${reservationId}/checkin`, body, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
    return response.data;
  },
};

export default api;
