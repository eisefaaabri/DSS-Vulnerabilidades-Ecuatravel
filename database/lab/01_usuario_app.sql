-- Se ejecuta una sola vez, cuando el contenedor crea el volumen de datos.

-- [VULN-04] La aplicación se conecta con un usuario SUPERUSER: puede borrar
-- cualquier base, crear roles, leer archivos del servidor y saltarse RLS.
-- [VULN-01] Contraseña en texto plano dentro del repositorio.
CREATE ROLE ecuatravel_app WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS
  PASSWORD 'EcuaTravel2026';

-- [VULN-04] Además es dueño de la base y tiene todos los privilegios sobre ella.
ALTER DATABASE booking_db OWNER TO ecuatravel_app;
GRANT ALL PRIVILEGES ON DATABASE booking_db TO ecuatravel_app;
GRANT ALL ON SCHEMA public TO ecuatravel_app;
