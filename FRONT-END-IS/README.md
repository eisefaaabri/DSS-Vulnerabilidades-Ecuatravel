# Ecuador Travel — Front-end (React + Vite)

SPA comercial para el microservicio de **Atracciones** (NestJS, versionado URI `v2`).
Permite explorar el catálogo, ver el detalle de cada atracción, consultar disponibilidad
y completar el ciclo de **reserva + pago** contra la API real.

## Requisitos

- Node.js 18+
- La API de Atracciones corriendo en `http://localhost:3000` (o la URL que configures).

## Desarrollo

```bash
npm install
npm run dev
```

En desarrollo, `VITE_API_URL=/api/v2` (ver `.env.development`) y Vite hace **proxy** de
`/api` hacia `http://localhost:3000` (ver `vite.config.js`), evitando CORS.

## Build y producción

```bash
npm run build     # genera dist/
npm run preview   # sirve dist/ localmente
```

Antes de compilar para producción define la URL pública de la API en `.env.production`:

```
VITE_API_URL=https://api.tudominio.com/api/v2
```

El proyecto incluye el fallback de rutas SPA para hosting estático:

- `vercel.json` (Vercel)
- `public/_redirects` (Netlify)

## Endpoints de la API utilizados

| Acción | Método y ruta |
| --- | --- |
| Listado paginado | `GET /atracciones?page=&limit=` |
| Detalle | `GET /atracciones/:id` |
| Disponibilidad | `GET /atracciones/:id/availability?date=AAAA-MM-DD` |
| Crear reserva | `POST /atracciones/:id/reservations` (+ `Idempotency-Key`) |
| Pagar reserva | `POST /atracciones/reservations/:reservationId/pay` |
| Login | `POST /auth/login` |
| Crear atracción | `POST /atracciones` |
| Actualizar atracción | `PATCH /atracciones/:id` |
| Eliminar atracción | `DELETE /atracciones/:id` |

## Autenticación

La API expone `POST /auth/login` (email + contraseña) y devuelve `{ access_token, user }`.
La web usa ese flujo como método principal y conserva la opción de **pegar un token JWT**
como respaldo (p. ej. el generado por `seed-test-user.js` del backend). El token debe:

- incluir `sub` como UUID v4 del usuario, y
- corresponder a un usuario con su **Cliente** asociado (necesario para reservar).

El rol viene en el campo `rol`/`roles` del payload JWT; con rol `ADMIN` aparece el enlace
**Panel B2B** (`/admin`) para crear, editar y eliminar atracciones (campos `estado`,
`duracion_horas`, `incluye` e `itinerario` incluidos).
