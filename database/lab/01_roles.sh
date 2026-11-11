#!/bin/bash
# Se ejecuta una sola vez, cuando el contenedor crea el volumen de datos.
# Las contraseñas llegan por variables de entorno desde .env.db (no versionado).
set -euo pipefail

: "${MIGRATOR_DB_PASSWORD:?Falta MIGRATOR_DB_PASSWORD}"
: "${APP_DB_PASSWORD:?Falta APP_DB_PASSWORD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" \
  -v migrator_pwd="$MIGRATOR_DB_PASSWORD" \
  -v app_pwd="$APP_DB_PASSWORD" <<'SQL'
-- Nadie entra a la base ni crea objetos salvo los roles definidos aquí.
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Migrador: dueño de los esquemas y tablas. Sin privilegios de administrador.
CREATE ROLE ecuatravel_migrator WITH LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 2
  PASSWORD :'migrator_pwd';
GRANT CONNECT, CREATE ON DATABASE :"db" TO ecuatravel_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO ecuatravel_migrator;

-- Aplicación: solo lee y escribe datos. No puede crear, alterar ni borrar tablas.
CREATE ROLE ecuatravel_app WITH LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 20
  PASSWORD :'app_pwd';
GRANT CONNECT ON DATABASE :"db" TO ecuatravel_app;
GRANT USAGE ON SCHEMA public TO ecuatravel_app;

-- Lo que el migrador cree después (esquemas ms_*, tablas, secuencias) queda
-- accesible para la app solo con permisos de datos.
ALTER DEFAULT PRIVILEGES FOR ROLE ecuatravel_migrator
  GRANT USAGE ON SCHEMAS TO ecuatravel_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ecuatravel_migrator
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ecuatravel_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ecuatravel_migrator
  GRANT USAGE, SELECT ON SEQUENCES TO ecuatravel_app;
SQL
