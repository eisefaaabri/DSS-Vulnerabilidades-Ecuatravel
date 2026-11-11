// [VULN-02] Secretos de la aplicación escritos en el código y versionados en Git.
// Cualquiera con acceso al repositorio (o a su historial) puede firmar JWT
// válidos, llamar a los endpoints M2M y falsificar vouchers.
export const JWT_SECRET = "ecuatravel-jwt-2026";
export const JWT_EXPIRES_IN = "30d";

export const BOOKING_API_KEY = "atr-booking-2026-ecuatravel-key";

export const VOUCHER_SECRET = JWT_SECRET;
