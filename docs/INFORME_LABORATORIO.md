# Práctica de Laboratorio: Gestión de Secretos y Configuración Segura

**Proyecto:** Ecuatravel, microservicio de Atracciones Turísticas
**Repositorio del laboratorio:** https://github.com/eisefaaabri/DSS-Vulnerabilidades-Ecuatravel
**Alcance de este documento:** las cuatro fases de la práctica (investigación, implementación insegura controlada, corrección y validación), las conclusiones y los entregables

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

## Fase 4. Validación, análisis y pruebas

### 4.1 Metodología

La validación quedó automatizada en `scripts/validar-seguridad.mjs`. Así se puede repetir en cualquier momento y el resultado no depende de pruebas manuales:

```bash
npm run validar
```

El script corre contra la aplicación levantada en local (API, base y frontend compilado) y agrupa las pruebas en cinco categorías:

| Categoría | Qué comprueba | Pruebas |
|---|---|---|
| Funcional | Que la app sigue funcionando con la configuración segura: catálogo, registro, login, reservas, panel de administración, creación de atracciones, integración M2M | 15 |
| Secretos | Que ningún secreto aparezca en respuestas HTTP, logs de arranque, Swagger, archivos versionados ni en el bundle del frontend; que los errores no devuelvan trazas; cabeceras seguras y CORS | 10 |
| Acceso | Autenticación y autorización: credenciales y tokens de la Fase 2, JWT forjados, expiración, roles, API key, fuerza bruta | 11 |
| Base de datos | Atributos de los roles, operaciones que el usuario de la app no puede hacer, contraseñas antiguas | 10 |
| Ambientes | Que la app se niegue a arrancar con una configuración insegura o de otro ambiente | 4 |

Algunos detalles del método:

- **Secretos sin mostrarlos:** el script lee los valores reales de `.env.development`, `.env.db` y `.env.seed` y los busca en cada salida, pero solo informa *si* aparecen, nunca *cuáles son*.
- **Log de arranque:** se levanta una segunda instancia de la API en otro puerto, se captura su salida completa y se busca cada secreto.
- **Ambientes:** se arranca la app con configuraciones malas (modo producción con la config de desarrollo, secreto débil, secretos repetidos, secreto faltante) y se verifica que termine con error y sin imprimir valores.
- **Reporte:** cada ejecución genera `docs/RESULTADOS_VALIDACION.md` con fecha y hora, como evidencia.

### 4.2 Resultados

**Resultado: 50 de 50 pruebas pasan.** El detalle de cada prueba (esperado y obtenido) está en [`RESULTADOS_VALIDACION.md`](RESULTADOS_VALIDACION.md).

Hallazgos durante la validación:

- **Límite de intentos en el login.** En la segunda ejecución seguida, la prueba de `admin123` devolvió `429` en lugar de `401`, porque el login admite 5 intentos por minuto por IP. Es un control que ya existía (`@nestjs/throttler`). Se agregó una prueba específica de fuerza bruta al final del script y se indica esperar 60 segundos entre ejecuciones.
- **Categorías solo en la v3.** La primera versión del script probaba `GET /v2/atracciones/categorias` y recibía `400`. El endpoint existe solo en la v3 (contrato con Booking) y el frontend no lo usa. Era un error de la prueba, no de la app, y se corrigió.

**Prueba funcional en el navegador** (`http://localhost:5173`):

- El inicio y el catálogo cargan a través del proxy de Vite.
- Con la base vacía, el catálogo muestra su estado vacío. Después de que el script creara una atracción, la muestra ("Mostrando 1–1 de 1 experiencia"). Puede tardar hasta 5 minutos en aparecer, porque el catálogo responde con `Cache-Control: max-age=300` (caché del diseño original) y el navegador conserva la lista anterior.
- Se interceptaron las peticiones del navegador: ninguna lleva la cabecera `X-API-Key`.

**Regreso a la Fase 2.** Se verificó el procedimiento de la sección "Volver a la versión insegura". Con el tag `fase-2-inseguro` y su volumen original, la API vuelve a exponer `/debug/config` (200), acepta `admin123` (200) y `ecuatravel_app` vuelve a ser superusuario. Al regresar a `main`, el `.env` de la Fase 2 desaparece del disco y la base segura sigue intacta.

### 4.3 Comparación antes y después

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
| 17 | JWT con algoritmo `none` | No probado | **401** |
| 18 | Fuerza bruta en `/auth/login` | No probado | **429** antes del sexto intento |
| 19 | Error con JSON malformado | No probado | **400** sin traza interna |
| 20 | Petición desde un origen desconocido (CORS) | No probado | Sin `Access-Control-Allow-Origin` |

### 4.4 Vulnerabilidades corregidas y riesgos mitigados

Nivel de riesgo = probabilidad × impacto, en escala cualitativa (Bajo, Medio, Alto, Crítico).

| ID | Vulnerabilidad | Riesgo antes | Medida aplicada | Riesgo después | Evidencia (pruebas del script) |
|---|---|---|---|---|---|
| VULN-01 | Contraseñas de la base en el código y en `docker-compose.yml` | **Alto**: acceso directo a la base para cualquiera con el repositorio | Variables de entorno, `.env.db` fuera de Git, contraseñas aleatorias nuevas | **Bajo** | "El código no tiene credenciales escritas", "Contraseña… de la Fase 2 rechazada" |
| VULN-02 | Secreto JWT, API key y secreto de vouchers en el código; API key en el frontend; tokens de 30 días | **Crítico**: tokens ADMIN forjados sin credenciales, suplantación de Booking | Secretos en el entorno, validación de largo y unicidad, JWT de 1 h (15 min en producción), API key fuera del frontend | **Bajo** | "JWT forjado…", "JWT con algoritmo none", "Endpoint M2M…", "Los tokens expiran…", "El bundle del frontend…" |
| VULN-03 | `.env` versionado, secretos en logs, endpoint `/debug/config` público | **Crítico**: todas las credenciales a un GET de distancia | `.gitignore` y `.dockerignore`, `git rm --cached`, endpoint eliminado, logs limpios, Swagger apagado en producción | **Medio** (residual: los valores viejos siguen en el historial, ya rotados) | "Endpoint de depuración eliminado", "El log de arranque…", "Ningún archivo .env…", "Los secretos actuales no están en archivos versionados" |
| VULN-04 | Usuario de la base SUPERUSER; admin por defecto `admin123`; `createUser` crea ADMIN por omisión | **Alto**: control total del servidor de base ante cualquier fuga o inyección | Roles migrador y app sin atributos administrativos, solo DML para la app, `scram-sha-256` también dentro del contenedor, admin creado a mano con contraseña fuerte, rol obligatorio | **Bajo** | Pruebas de la categoría "Base de datos", "La contraseña por defecto admin123…", "Crear usuario sin rol…" |
| — | Sin separación de ambientes | **Alto**: configuración de desarrollo en producción sin que nadie lo note | Plantillas por ambiente y reglas de producción que detienen el arranque | **Bajo** | Pruebas de la categoría "Ambientes" |

Los riesgos residuales y sus mejoras posibles están en la sección **Riesgos residuales** de la Fase 3.

---

## Conclusiones sobre desarrollo seguro

1. **Un secreto en el código es un secreto publicado.** En cuanto entra a un commit queda en cada clon, fork y copia del repositorio. Borrarlo después no lo recupera: el `.env` de la Fase 2 sigue en el historial. La única defensa real es no subirlo nunca y, si se sube, cambiarlo de inmediato.

2. **`.gitignore` previene, pero no corrige.** Excluir el archivo evita la próxima fuga, no la anterior. Por eso la corrección combinó tres cosas: excluir, sacar del índice y rotar todos los valores.

3. **El mínimo privilegio reduce el daño cuando algo falla.** En la Fase 2, cualquier fallo en la app le daba al atacante el servidor de base completo. En la Fase 3, aunque alguien robe la credencial de la app, solo puede leer y escribir datos: no borra tablas, no crea usuarios, no lee archivos del servidor. Separar el usuario que migra del que ejecuta cuesta poco y limita mucho el impacto.

4. **La configuración debe validarse, no suponerse.** Varios fallos del proyecto original no estaban en la lógica, sino en lo que pasaba cuando faltaba una variable: un secreto de respaldo público y endpoints M2M abiertos sin clave. Hacer que la app se niegue a arrancar con una configuración incompleta o insegura convierte un error silencioso en uno visible.

5. **Separar ambientes también es seguridad.** Un único `.env` para todo hace que las credenciales de desarrollo, que circulan por las máquinas del equipo, sean las mismas que las de producción. Con archivos y reglas por ambiente, copiar la configuración equivocada a producción se detecta al arrancar.

6. **El frontend no guarda secretos.** Todo lo que llega al navegador (bundle, variables `VITE_`, cabeceras) lo puede leer cualquiera. Las claves entre servidores se quedan en el servidor.

7. **La seguridad se demuestra con pruebas que se puedan repetir.** El script de la Fase 4 deja una evidencia que se puede volver a ejecutar después de cada cambio. Además, durante su construcción salieron a la luz controles que no estaban documentados (límite de intentos en el login) y detalles que no se veían a simple vista (PostgreSQL confiaba en las conexiones locales del contenedor).

8. **Los defaults no son seguros por ser defaults.** La imagen oficial de PostgreSQL, el `createUser` con ADMIN por omisión y el secreto JWT de respaldo eran comportamientos por defecto. Revisarlos y cambiarlos a propósito es parte del trabajo.

---

## Entregables

| Entregable | Dónde está |
|---|---|
| 1. Código corregido | Rama `main`, tag `fase-3-seguro` (corrección) y `fase-4-validado` (validación). La versión insegura queda en el tag `fase-2-inseguro`. |
| 2. Capturas de pantalla | Las tomas el estudiante siguiendo las secciones "Capturas sugeridas" de las fases 2 y 3, más la salida de `npm run validar` |
| 3. Informe técnico | Este documento (vulnerabilidades, soluciones y pruebas) y `docs/RESULTADOS_VALIDACION.md` |
| 4. Conclusiones | Sección "Conclusiones sobre desarrollo seguro" |

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

5. Validar. El script necesita el frontend compilado (`cd FRONT-END-IS && npm run build`) y que el backend esté corriendo con `npm run build` hecho, porque arranca instancias de prueba desde `dist/`:

   ```bash
   npm run validar
   ```

| Servicio | URL |
|---|---|
| API | http://localhost:3001/api/v3 |
| Swagger | http://localhost:3001/api/docs |
| Frontend | http://localhost:5173 |
| PostgreSQL | `127.0.0.1:5433` (el 5432 lo usa el contenedor del proyecto principal) |

### Volver a la versión insegura (Fase 2) para tomar capturas

La Fase 2 usa otro volumen (`pgdata`), así que sus datos siguen intactos. Este procedimiento se probó en la Fase 4. Si hay cambios sin commitear, primero guárdalos con `git stash -u` y recupéralos con `git stash pop` al volver:

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
