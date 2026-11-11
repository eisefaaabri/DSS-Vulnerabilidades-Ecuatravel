/** Misma regla que PostgreSQL / IdempotencyKeyGuard: UUID v4 estricto. */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(value) {
  return typeof value === 'string' && UUID_V4_REGEX.test(value.trim());
}

/** Decodifica payload JWT (sin verificar firma — solo validación de forma en cliente). */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * El backend usa payload.sub como usuarioId (UUID en BD).
 * Rechaza tokens de prueba con sub tipo "admin-999".
 */
export function validateAuthToken(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.sub) {
    return { ok: false, message: 'Token inválido: no contiene identificador de usuario (sub).' };
  }
  if (!isUuidV4(payload.sub)) {
    return {
      ok: false,
      message:
        'Token rechazado: el campo sub debe ser un UUID v4 de PostgreSQL. Genera el token con un usuario real (seed-test-user.js o login del hub de auth).',
    };
  }
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return { ok: false, message: 'Token expirado. Inicia sesión de nuevo.' };
  }
  return { ok: true, payload };
}
