# Práctica de Laboratorio: Gestión de Secretos y Configuración Segura

**Proyecto:** Ecuatravel, microservicio de Atracciones Turísticas
**Repositorio del laboratorio:** https://github.com/eisefaaabri/DSS-Vulnerabilidades-Ecuatravel
**Alcance de este documento:** Fase 1 (investigación inicial), Fase 2 (implementación insegura controlada) y Fase 3 (corrección segura y endurecimiento), con las pruebas que adelantan la Fase 4

---

## Fase 1. Investigación inicial

### 1.1 Aplicación seleccionada

En lugar de crear una aplicación nueva desde cero, se usó una aplicación real desarrollada durante el semestre: la API de Atracciones de Ecuatravel, con su frontend. Así las vulnerabilidades se estudian en un sistema con autenticación, roles, integración con terceros y una base de datos con varios esquemas, que se parece más a un caso real que un ejemplo de pocas líneas.

| Componente | Tecnología | Por qué se eligió |
|---|---|---|
| Back-end | API REST con **Node.js + NestJS 10** (TypeScript) | Organiza el código en módulos (auth, atracciones, clientes, personal). Trae `@nestjs/config` para leer variables de entorno, validación con `class-validator` y guards para autenticación y roles. |
| Front-end | **React + Vite** | Consume la API con Axios. Vite separa las variables por ambiente (`.env.development`, `.env.production`), lo que sirve para mostrar qué datos llegan al navegador. |
| Documentación de la API | **Swagger / OpenAPI** en `/api/docs` | Permite probar los endpoints desde el navegador y deja ver qué rutas quedan expuestas. |

### 1.2 Base de datos

| Opción evaluada | Decisión |
|---|---|
| **PostgreSQL 16** | **Elegida.** Maneja roles y privilegios finos (`CREATE ROLE`, `GRANT`, `REVOKE`, `SUPERUSER`, `BYPASSRLS`) y seguridad a nivel de fila (RLS). Esto es justo lo que se necesita para aplicar mínimo privilegio en la Fase 3. |
| MySQL | También tiene usuarios y `GRANT`, pero el proyecto ya estaba modelado en PostgreSQL, con esquemas `ms_*` por microservicio. |
| MongoDB | Descartada: el modelo es relacional (reservas, órdenes, pagos) y depende de transacciones y llaves foráneas. |

La base corre en **Docker** (`postgres:16`) y el esquema se crea con **migraciones de TypeORM**. No se usa `synchronize`, así que el esquema queda versionado en el código.

### 1.3 Herramientas de desarrollo y control de versiones

| Herramienta | Uso en la práctica |
|---|---|
| Visual Studio Code | Editor principal |
| Git + GitHub | Control de versiones. El historial muestra qué secretos se subieron y cuándo. |
| npm | Gestión de dependencias del back-end y del front-end |
| Docker Desktop + Docker Compose | Levanta PostgreSQL en local con un solo comando |
| ESLint + Prettier | Calidad y formato del código |
| Terminal (PowerShell / Git Bash) en Windows 11 | Ejecución, pruebas con `curl` y consultas con `psql` |

### 1.4 Métodos seguros para la gestión de secretos

| Método | Qué resuelve | Limitaciones | ¿Se usa en la práctica? |
|---|---|---|---|
| **Variables de entorno + archivo `.env`** (`@nestjs/config`, `dotenv`) | Saca los secretos del código fuente. Cada máquina tiene sus propios valores. | El archivo queda en texto plano en el disco. Si no se excluye de Git, se filtra. | Sí (Fase 3) |
| **`.gitignore`** | Evita que `.env` y archivos similares lleguen al repositorio | No borra lo que ya se subió: el secreto queda en el historial y hay que rotarlo | Sí (Fase 3) |
| **`.env.example`** | Documenta qué variables necesita la app, con valores de ejemplo | Nunca debe contener valores reales | Sí (Fase 3) |
| **Un archivo por ambiente** (`.env.development`, `.env.production`) | Separa credenciales de desarrollo y producción | Hay que controlar cuál se carga en cada entorno | Sí (Fase 3) |
| **Secretos del CI/CD** (GitHub Actions Secrets) | Inyecta credenciales en el pipeline sin escribirlas en el repositorio | Solo sirve dentro del pipeline | Se usaba en el proyecto original (despliegue a Azure); se quitó en el laboratorio |
| **Configuración del proveedor de nube** (Azure App Service, Vercel) | Variables de entorno administradas por la plataforma | Depende del proveedor | Se usaba en el proyecto original |
| **Gestores de secretos** (Azure Key Vault, HashiCorp Vault, AWS Secrets Manager) | Cifrado, control de acceso, auditoría y rotación automática | Más complejidad y costo; demasiado para un entorno local | Investigado, no aplicado |
| **Mínimo privilegio en la base de datos** | Si una credencial se filtra, el daño queda limitado a lo que ese usuario puede hacer | Requiere diseñar roles por tarea (migraciones o ejecución) | Sí (Fase 3) |

### 1.5 Preparación del repositorio del laboratorio

Para no afectar al proyecto principal, que está desplegado, se creó un repositorio aparte y se trabaja **solo en local**:

- Se copiaron únicamente los archivos versionados del proyecto, sin el `.env` real, sin `node_modules`, sin `dist` y sin el historial de commits.
- Se eliminaron los workflows de GitHub Actions (despliegue a Azure y keep-alive de Supabase). Así ningún push del laboratorio llega a producción.
- Se eliminaron `vercel.json` y `public/_redirects` del frontend, que solo sirven para desplegar.
- Se reemplazaron correos de personas reales que aparecían como ejemplo por correos de `ejemplo.com`.
- Todos los secretos de la Fase 2 son **ficticios** y la app apunta a una base local.

Estructura resultante:

```
DSS-Vulnerabilidades-Ecuatravel/
├── src/                 API NestJS (módulos, migraciones, configuración)
├── FRONT-END-IS/        Frontend React + Vite
├── database/lab/        Script de inicialización de PostgreSQL (Docker)
├── docker-compose.yml   PostgreSQL 16 en el puerto 5433
└── .env                 (versionado a propósito en la Fase 2)
```

---

## Fase 2. Identificación de vulnerabilidades (implementación insegura controlada)

En esta fase se configuró la aplicación con malas prácticas a propósito, siguiendo los cuatro puntos de la práctica. Cada vulnerabilidad está marcada en el código con una etiqueta `[VULN-0X]` para encontrarla y corregirla en la Fase 3. Se puede buscar así:

```bash
git grep -n "VULN-0"
```

El estado de esta fase quedó guardado en el commit `48f086e`, con el tag **`fase-2-inseguro`**.

### Resumen

| ID | Requisito de la práctica | Clasificación | Severidad |
|---|---|---|---|
| VULN-01 | Contraseñas visibles en el código | CWE-798, CWE-259 · OWASP A07:2021 | Alta |
| VULN-02 | Tokens expuestos | CWE-321, CWE-798, CWE-613 · OWASP A02:2021, A07:2021 | Crítica |
| VULN-03 | Variables sensibles sin protección | CWE-540, CWE-532, CWE-200 · OWASP A05:2021 | Crítica |
| VULN-04 | Usuarios con privilegios administrativos innecesarios | CWE-250, CWE-269, CWE-1392 · OWASP A01:2021, A05:2021 | Alta |

---

### VULN-01. Contraseñas visibles en el código

**Qué se hizo:** las credenciales de la base de datos se escribieron directamente en el código y en los archivos de configuración versionados.

| Archivo | Contenido inseguro |
|---|---|
| `src/config/database.config.ts` | Constante `DATABASE_URL` con usuario y contraseña (`ecuatravel_app:EcuaTravel2026`). TypeORM la usa en lugar de leer la variable de entorno. |
| `src/data-source.ts` | La misma cadena de conexión, usada por la CLI de migraciones |
| `docker-compose.yml` | Contraseña del superusuario `postgres` en texto plano (`POSTGRES_PASSWORD: Admin2026`) |
| `database/lab/01_usuario_app.sql` | `PASSWORD 'EcuaTravel2026'` en la creación del rol |
| `src/migrations/1900000000000-LabAdminPorDefecto.ts` | Contraseña del administrador por defecto (`admin123`) |

**Riesgo:** cualquiera que tenga acceso al repositorio, a una copia, a un fork o a su historial obtiene acceso directo a la base. Cambiar la contraseña obliga a modificar el código y volver a desplegar, y la anterior queda para siempre en el historial de Git.

---

### VULN-02. Tokens expuestos

**Qué se hizo:** los secretos criptográficos y las claves de integración se centralizaron en un archivo de constantes versionado, y la clave M2M se copió además al frontend.

| Archivo | Contenido inseguro |
|---|---|
| `src/config/secretos.ts` | `JWT_SECRET`, `BOOKING_API_KEY` y `VOUCHER_SECRET` (el mismo valor que el JWT), escritos en el código |
| `src/modules/auth/auth.module.ts` | Firma los JWT con el secreto fijo; expiración ampliada de 1 hora a **30 días** |
| `src/modules/auth/jwt.strategy.ts` | Verifica los JWT con el mismo secreto fijo |
| `src/common/guards/api-key.guard.ts` | Compara la cabecera `X-API-Key` contra la constante del código |
| `src/modules/atracciones/integracion-booking.service.ts` | Firma los vouchers QR con el secreto fijo |
| `FRONT-END-IS/src/services/api.js` | La clave M2M (pensada solo para la comunicación entre servidores) se envía en la cabecera `X-API-Key` de **todas** las peticiones del navegador |

**Riesgo:**
- Con el secreto JWT, un atacante puede **firmar sus propios tokens** con cualquier rol, incluido ADMIN, sin conocer ninguna contraseña.
- La clave M2M queda dentro del bundle JavaScript público. Cualquier visitante la ve en las herramientas de desarrollo y puede hacerse pasar por el sistema de Booking.
- Los vouchers QR se pueden falsificar.
- Un token robado sirve durante 30 días.

---

### VULN-03. Variables sensibles sin protección

**Qué se hizo:** los secretos se expusieron por tres vías: el repositorio, los logs y un endpoint HTTP.

| Vía | Detalle |
|---|---|
| **`.env` versionado** | Se quitaron `.env`, `.env.test` y `.env.production` del `.gitignore`, y se subió un `.env` con todas las credenciales. Hay un solo archivo para todos los ambientes: desarrollo y "producción" comparten las mismas credenciales. |
| **Logs** | `src/main.ts` imprime al arrancar la cadena de conexión completa, el `JWT_SECRET` y la `BOOKING_API_KEY` |
| **Endpoint de depuración** | `src/modules/atracciones/debug.controller.ts` expone `GET /api/v3/debug/config` **sin autenticación ni rol**. Devuelve la cadena de conexión, los secretos y las variables de entorno sensibles. También aparece documentado en Swagger. |

**Riesgo:** los logs suelen terminar en plataformas que leen otras personas (consola de la nube, herramientas de monitoreo, capturas compartidas). El endpoint de depuración entrega todas las credenciales a cualquiera que conozca la URL, y Swagger se la muestra.

---

### VULN-04. Usuarios con privilegios administrativos innecesarios

**Qué se hizo:** se dieron más privilegios de los necesarios tanto en la base de datos como en la aplicación.

**En PostgreSQL** (`database/lab/01_usuario_app.sql`, que Docker ejecuta al crear el volumen):

```sql
CREATE ROLE ecuatravel_app WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS
  PASSWORD 'EcuaTravel2026';
ALTER DATABASE booking_db OWNER TO ecuatravel_app;
GRANT ALL PRIVILEGES ON DATABASE booking_db TO ecuatravel_app;
```

La aplicación solo necesita leer y escribir en sus tablas. Sin embargo, su usuario puede borrar cualquier base, crear otros usuarios, leer archivos del servidor y saltarse las políticas RLS.

**En la aplicación:**

| Archivo | Problema |
|---|---|
| `src/migrations/1900000000000-LabAdminPorDefecto.ts` | Crea en cada instalación una cuenta ADMIN con credenciales conocidas: `admin@ecuatravel.com` / `admin123` |
| `src/modules/auth/auth.service.ts` | `createUser` asigna el rol **ADMIN por defecto** si no se envía un rol |

**Riesgo:** si alguien inyecta SQL o roba la credencial de la app, obtiene control total del servidor de base de datos, no solo de las tablas de la aplicación. La cuenta por defecto es lo primero que prueba un atacante. Además, crear un empleado olvidando el rol le da acceso de administrador.

---

### Vulnerabilidades que ya existían en el proyecto original

Durante el análisis aparecieron tres problemas que **no se agregaron a propósito**: ya estaban en el proyecto principal. Se documentan como hallazgos reales:

| Hallazgo | Ubicación original | Riesgo |
|---|---|---|
| Secreto JWT de respaldo `fallback_secret_for_dev_only_123` escrito en el código | `auth.module.ts` y `jwt.strategy.ts` | Si `JWT_SECRET` no está definido fuera de producción, se usa un secreto público |
| `createUser` asigna ADMIN cuando no se indica el rol | `auth.service.ts` | Escalada de privilegios por omisión |
| La aplicación se conecta como `postgres` (superusuario), en local y en Supabase | `.env` / `DATABASE_URL` | Privilegios administrativos innecesarios |

También se observó que el frontend guarda el JWT en `localStorage`, al que puede acceder cualquier script que logre ejecutarse en la página (XSS).

---

### Pruebas realizadas en la Fase 2

Se ejecutaron contra la aplicación corriendo en local (`http://localhost:3001/api/v3`):

| # | Prueba | Resultado obtenido |
|---|---|---|
| 1 | `GET /health` | `200`: la aplicación funciona con la configuración insegura |
| 2 | `GET /debug/config` sin token | `200`: devuelve la cadena de conexión, `JWT_SECRET`, `BOOKING_API_KEY` y la contraseña del superusuario |
| 3 | Login con `admin@ecuatravel.com` / `admin123` | Token de ADMIN válido por **30 días** |
| 4 | JWT falsificado con el secreto del repositorio (`rol: ADMIN`, usuario inexistente) contra `GET /auth/users` | `200`: acceso administrativo sin credenciales |
| 5 | `POST /auth/users` sin campo `rol` | El usuario se crea con `"rol": "ADMIN"` |
| 6 | `GET /atracciones/eventos` (endpoint M2M) | Sin clave: `401`. Con la clave sacada del frontend: `200` |
| 7 | `POST /auth/register` (turista) | `201`: el flujo normal sigue funcionando |
| 8 | Consulta en `pg_roles` del usuario `ecuatravel_app` | `rolsuper = t`, `rolcreaterole = t`, `rolcreatedb = t`, `rolbypassrls = t` |
| 9 | Frontend en `http://localhost:5173` | Carga las atracciones y `api.js` incluye la clave M2M |

### Capturas sugeridas como evidencia

1. Navegador en `http://localhost:3001/api/v3/debug/config` mostrando los secretos.
2. Consola del backend al arrancar, con la cadena de conexión, el JWT y la API key.
3. GitHub mostrando el archivo `.env` subido y `src/config/secretos.ts`.
4. DevTools del frontend: pestaña **Red** con la cabecera `X-API-Key` y pestaña **Fuentes** con la clave en `api.js`.
5. Resultado de la consulta de privilegios en PostgreSQL:

   ```bash
   docker exec dss_ecuatravel_db psql -U postgres -d booking_db -c "SELECT rolname, rolsuper, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname='ecuatravel_app';"
   ```

6. Login exitoso con `admin@ecuatravel.com` / `admin123` en Swagger (`http://localhost:3001/api/docs`).

---

## Fase 3. Corrección segura y endurecimiento

El estado corregido quedó con el tag **`fase-3-seguro`**. En el código ya no queda ninguna etiqueta `[VULN-0X]`, ningún secreto ni ninguna contraseña.

### Resumen de correcciones

| ID | Corrección aplicada | Archivos principales |
|---|---|---|
| VULN-01 | Las credenciales salen de variables de entorno. `docker-compose.yml` y el script de roles leen las contraseñas desde `.env.db`. Se eliminó la migración con `admin123`. | `database.config.ts`, `data-source.ts`, `docker-compose.yml`, `database/lab/01_roles.sh` |
| VULN-02 | Se eliminó `secretos.ts`. JWT, API key y voucher se leen con `ConfigService.getOrThrow`, deben tener 32+ caracteres y ser distintos entre sí. El JWT vuelve a durar 1 hora (15 minutos en producción). La clave M2M sale del frontend. | `env.validation.ts`, `auth.module.ts`, `jwt.strategy.ts`, `api-key.guard.ts`, `integracion-booking.service.ts`, `FRONT-END-IS/src/services/api.js` |
| VULN-03 | `.env` sale del repositorio y vuelve al `.gitignore`. Se borró el endpoint de depuración y los logs ya no imprimen secretos. Swagger se apaga por defecto en producción. | `.gitignore`, `.dockerignore`, `main.ts` |
| VULN-04 | Roles de PostgreSQL sin privilegios administrativos (migrador y app separados). `createUser` exige un rol explícito. El primer admin se crea a mano con una contraseña fuerte. | `01_roles.sh`, `create-user.dto.ts`, `auth.service.ts`, `src/scripts/crear-admin.ts` |

### 3.1 Archivo de variables de entorno `.env`

- **Ningún secreto vive en el código.** Todos se leen con `ConfigService`. Si falta uno, `getOrThrow` detiene el arranque.
- **Validación al arrancar** (`src/config/env.validation.ts`). La app no arranca si:
  - falta una variable obligatoria (`DATABASE_URL`, `JWT_SECRET`, `BOOKING_API_KEY`, `VOUCHER_SECRET`);
  - algún secreto tiene menos de 32 caracteres;
  - dos secretos son iguales (antes el voucher reutilizaba el secreto del JWT);
  - `JWT_EXPIRES_IN` no es en minutos u horas (no se aceptan tokens de días).

  Los mensajes de error nombran la variable, nunca su valor.
- **Rotación:** todos los valores expuestos en la Fase 2 se consideran comprometidos. Los nuevos se generaron al azar con `crypto.randomBytes` y no se reutiliza ninguno de los anteriores.
- **Cada proceso recibe solo los secretos que necesita:**

| Archivo (no versionado) | Lo lee | Contenido |
|---|---|---|
| `.env.db` | Solo `docker compose` | Contraseñas del superusuario, del migrador y de la app |
| `.env.development` | El backend en desarrollo y la CLI de migraciones | URL de la app, URL del migrador, secretos de desarrollo |
| `.env.production` | El backend en producción (en la práctica, el panel del proveedor) | URL de la app, secretos de producción |
| `.env.seed` | Solo `npm run seed:admin` | Correo y contraseña del primer administrador |

De cada archivo se versiona únicamente su plantilla `*.example`, sin valores reales.

### 3.2 Exclusión de secretos con `.gitignore`

```gitignore
.env
.env.*
!.env.example
!.env.*.example
!FRONT-END-IS/.env.development
```

- Se ejecutó `git rm --cached .env` para que el archivo deje de versionarse.
- El frontend sigue versionando `.env.development` porque solo contiene `VITE_API_URL=/api/v2`. Todo lo que lleva el prefijo `VITE_` termina en el bundle público, así que ahí nunca debe ir un secreto.
- `.dockerignore` también excluye `.env.*`, para que ningún archivo de entorno entre en una imagen.
- **El historial de Git no se borra con `.gitignore`.** El `.env` de la Fase 2 sigue visible en el commit `48f086e` (tag `fase-2-inseguro`). La mitigación aplicada es **rotar todos los secretos**: los valores del historial ya no abren nada (las pruebas 5, 7 y 13 lo confirman). En un proyecto real, además, se reescribiría el historial con `git filter-repo` o BFG. Aquí no se hizo, para conservar la evidencia de la Fase 2.

### 3.3 Mínimo privilegio en la base de datos

`database/lab/01_roles.sh` crea dos roles. Las contraseñas llegan por variables de entorno, no están en el archivo:

| Rol | Atributos | Permisos | Para qué |
|---|---|---|---|
| `postgres` | Superusuario | Todo | Solo administración manual. La app nunca lo usa. |
| `ecuatravel_migrator` | `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, máximo 2 conexiones | `CONNECT, CREATE` en la base; dueño de los esquemas `ms_*` | Ejecutar migraciones (`npm run migration:run`) |
| `ecuatravel_app` | `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, máximo 20 conexiones | `SELECT, INSERT, UPDATE, DELETE` en tablas; `USAGE` en secuencias y esquemas | La aplicación en ejecución |

Otras medidas:

- Se quitaron a `PUBLIC` los permisos sobre la base y la creación de objetos en `public`.
- Con `ALTER DEFAULT PRIVILEGES`, cada tabla que cree el migrador llega a la app solo con permisos de datos.
- La app ya no ejecuta migraciones al arrancar (`migrationsRun: false`), porque su usuario no tiene permisos DDL.
- PostgreSQL exige contraseña (`scram-sha-256`) incluso dentro del contenedor. Por defecto la imagen oficial confía (`trust`) en esas conexiones.
- El puerto se publica solo en `127.0.0.1:5433`, así que la base no es accesible desde la red local.

### 3.4 Mínimo privilegio en los usuarios de la aplicación

- **Sin cuenta ADMIN por defecto:** se eliminó la migración que creaba `admin@ecuatravel.com` / `admin123`.
- **Primer administrador bajo control:** `npm run seed:admin` lo crea una sola vez, con el usuario de la app (solo necesita `INSERT`). Exige una contraseña de 12+ caracteres con mayúscula, minúscula, número y símbolo, la guarda con bcrypt (costo 12) y se niega a sobrescribir un usuario existente.
- **Rol explícito:** `POST /auth/users` rechaza con `400` una petición sin `rol`. Ya no se crea un ADMIN por omisión.

### 3.5 Separación de ambientes de desarrollo y producción

- La app carga `.env.<NODE_ENV>.local` y `.env.<NODE_ENV>`. Sin `NODE_ENV`, usa `development`.
- **Reglas extra en producción.** La app no arranca si:
  - `DB_SSL` no es `true`;
  - falta `DB_SSL_CA` (sin ella no se verifica el certificado del servidor);
  - `DATABASE_URL` apunta a `localhost`;
  - `FRONTEND_URL` no usa `https://`;
  - `DB_SYNCHRONIZE` es `true`.
- **Swagger:** activo en desarrollo, apagado por defecto en producción.
- **Migraciones:** en producción, `DATABASE_MIGRATIONS_URL` no forma parte de la configuración de la app. Solo la recibe el job de migraciones del CI/CD.
- **Secretos distintos:** `.env.production.example` indica generar secretos propios. Nunca se copian los de desarrollo.

La prueba 10 muestra que copiar la configuración de desarrollo a producción no funciona: la app se detiene y lista las reglas que fallan.

### Hallazgos previos corregidos

| Hallazgo del proyecto original | Estado |
|---|---|
| Secreto JWT de respaldo `fallback_secret_for_dev_only_123` | Eliminado: sin `JWT_SECRET` la app no arranca |
| `createUser` asignaba ADMIN por defecto | Corregido: el rol es obligatorio |
| La app se conectaba como `postgres` (superusuario) | Corregido: usa `ecuatravel_app` |
| En desarrollo, sin `BOOKING_API_KEY` los endpoints M2M quedaban abiertos | Corregido: la clave es obligatoria en todos los ambientes |

### Riesgos residuales

| Riesgo | Por qué queda | Mejora posible |
|---|---|---|
| Secretos de la Fase 2 en el historial de Git | Se conservan como evidencia; ya están rotados | `git filter-repo` y forzar el push |
| Contraseñas de la base visibles con `docker inspect` (variables de entorno del contenedor) | Simplicidad del entorno local | Docker secrets (`POSTGRES_PASSWORD_FILE`) o un gestor de secretos |
| El frontend guarda el JWT en `localStorage` | Cambiarlo implica rediseñar la sesión (cookies `HttpOnly`) | Cookie `HttpOnly` + `SameSite` y token de refresco |
| `.env.development` en texto plano en el disco | Es el método pedido por la práctica | En producción, un gestor de secretos (Azure Key Vault) |

### Capturas sugeridas para la Fase 3

1. `GET http://localhost:3001/api/v3/debug/config` respondiendo `404`.
2. Consola del backend al arrancar, sin secretos.
3. GitHub: el `.env` ya no aparece y existen las plantillas `.env.*.example`.
4. Consulta de roles: `rolsuper`, `rolcreaterole` y `rolbypassrls` en `f`.
5. El usuario de la app intentando `DROP TABLE` y recibiendo `must be owner of table`.
6. Arranque con `NODE_ENV=production` y la configuración de desarrollo, fallando con la lista de reglas.
7. Login con `admin123` respondiendo `401`, y `POST /auth/users` sin rol respondiendo `400`.
8. DevTools del frontend: las peticiones ya no llevan `X-API-Key`.

---

## Fase 4 (adelanto). Pruebas de validación ejecutadas

Pruebas sobre la versión corregida, en local:

| # | Prueba | Fase 2 | Fase 3 |
|---|---|---|---|
| 1 | `GET /health` | 200 | 200 |
| 2 | `GET /debug/config` sin token | 200 con todos los secretos | **404** |
| 3 | Secretos en el log de arranque | Aparecen | **No aparecen** (se buscaron los valores reales en el log) |
| 4 | Login `admin@ecuatravel.com` / `admin123` | Token de 30 días | **401**; el admin creado con el script funciona y su token dura 60 minutos |
| 5 | JWT forjado con el secreto viejo contra `GET /auth/users` | 200 | **401** |
| 6 | `POST /auth/users` sin `rol` | Crea un ADMIN | **400** "El rol debe ser ADMIN o TURISTA"; con `rol: TURISTA` → 201 |
| 7 | `GET /atracciones/eventos` con la clave vieja | 200 | **401**; con la clave nueva → 200 |
| 8 | `POST /auth/register` (turista) | 201 | 201 |
| 9 | Usuario de la app: `DROP TABLE`, `CREATE TABLE`, `TRUNCATE`, `CREATE ROLE`, `CREATE DATABASE`, `pg_read_file` | Todo permitido (superusuario) | **Todo denegado**; `SELECT` sí funciona |
| 10 | Arrancar con `NODE_ENV=production` y la config de desarrollo | Arrancaba | **Se detiene**: pide SSL, CA, base no local y HTTPS |
| 11 | Arrancar con `JWT_SECRET` de 5 caracteres | Arrancaba | **Se detiene**: mínimo 32 caracteres |
| 12 | Archivos `.env` versionados | `.env` en el repositorio | Solo plantillas `*.example` (y `FRONT-END-IS/.env.development`, sin secretos) |
| 13 | Conexión a PostgreSQL con contraseñas de la Fase 2 | Conectaba | **Rechazada** |
| 14 | `psql` dentro del contenedor sin contraseña | Entraba (`trust`) | **Pide contraseña** (`scram-sha-256`) |
| 15 | Bundle de producción del frontend | Contiene la clave M2M | **Sin clave** |
| 16 | Frontend en `http://localhost:5173` | Funciona | Funciona; carga atracciones por el proxy |

---

## Cómo ejecutar el proyecto en local (versión corregida)

Requisitos: Node.js y Docker Desktop encendido.

1. Crear los archivos de entorno a partir de las plantillas y completar los valores (generar cada secreto con `crypto.randomBytes`):

   ```bash
   cp .env.db.example .env.db && cp .env.development.example .env.development && cp .env.seed.example .env.seed
   ```

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

2. Levantar PostgreSQL. La primera vez crea los roles:

   ```bash
   npm run db:up
   ```

3. Instalar dependencias, aplicar las migraciones con el usuario migrador y crear el primer administrador:

   ```bash
   npm install
   ```

   ```bash
   npm run migration:run
   ```

   ```bash
   npm run seed:admin
   ```

4. Arrancar el backend y el frontend:

   ```bash
   npm run start:dev
   ```

   ```bash
   cd FRONT-END-IS && npm install && npm run dev
   ```

| Servicio | URL |
|---|---|
| API | http://localhost:3001/api/v3 |
| Swagger | http://localhost:3001/api/docs |
| Frontend | http://localhost:5173 |
| PostgreSQL | `127.0.0.1:5433` (el 5432 lo usa el contenedor del proyecto principal) |

### Volver a la versión insegura (Fase 2) para tomar capturas

La Fase 2 usa otro volumen (`pgdata`), así que sus datos siguen intactos:

```bash
npm run db:down
```

```bash
git checkout fase-2-inseguro
```

```bash
docker compose up -d && npm run build && npm run start:prod
```

Para regresar: `docker compose down`, `git checkout main` y `npm run db:up`.
