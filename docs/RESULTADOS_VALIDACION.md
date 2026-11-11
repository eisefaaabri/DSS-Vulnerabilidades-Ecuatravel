# Resultados de validación (Fase 4)

Generado por `npm run validar` el 11/11/2026, 8:34:02 a. m..
Resultado: **50/50 pruebas pasan**.

| # | Categoría | Prueba | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| 1 | Funcional | Health de la API con la base conectada | HTTP 200 | HTTP 200 · UP | ✅ |
| 2 | Funcional | Catálogo público de atracciones | HTTP 200 | HTTP 200 | ✅ |
| 3 | Funcional | Categorías del catálogo (contrato v3) | HTTP 200 | HTTP 200 | ✅ |
| 4 | Funcional | Registro de un turista nuevo | HTTP 201 | HTTP 201 | ✅ |
| 5 | Funcional | Login del turista | HTTP 200 + JWT | HTTP 200 | ✅ |
| 6 | Funcional | El turista consulta sus reservas | HTTP 200 | HTTP 200 | ✅ |
| 7 | Funcional | El turista consulta su lista de deseos | HTTP 200 | HTTP 200 | ✅ |
| 8 | Funcional | Login del administrador creado con seed:admin | HTTP 200 + JWT | HTTP 200 | ✅ |
| 9 | Funcional | El admin lista usuarios | HTTP 200 | HTTP 200 | ✅ |
| 10 | Funcional | El admin lista clientes | HTTP 200 | HTTP 200 | ✅ |
| 11 | Funcional | El admin lista reservas | HTTP 200 | HTTP 200 | ✅ |
| 12 | Funcional | El admin crea un usuario con rol explícito | HTTP 201 | HTTP 201 | ✅ |
| 13 | Funcional | El admin crea una atracción (escritura con el usuario limitado) | HTTP 201 | HTTP 201 | ✅ |
| 14 | Funcional | La atracción nueva aparece en el detalle público | HTTP 200 | HTTP 200 | ✅ |
| 15 | Funcional | Booking consulta eventos con la API key vigente | HTTP 200 | HTTP 200 | ✅ |
| 16 | Secretos | Endpoint de depuración eliminado | HTTP 404 | HTTP 404 | ✅ |
| 17 | Secretos | El log de arranque no imprime secretos | 0 secretos en la salida | 0 secretos | ✅ |
| 18 | Secretos | Swagger no contiene secretos | 0 secretos en /api/docs-json | HTTP 200 · 0 secretos | ✅ |
| 19 | Secretos | Un error no devuelve trazas internas | 400 sin stack | HTTP 400 · sin traza | ✅ |
| 20 | Secretos | Cabeceras seguras (helmet) | nosniff y sin X-Powered-By | nosniff=true, x-powered-by=false | ✅ |
| 21 | Secretos | CORS rechaza orígenes desconocidos | sin Access-Control-Allow-Origin | no se permite el origen | ✅ |
| 22 | Secretos | Ningún archivo .env real versionado | solo plantillas *.example | solo plantillas | ✅ |
| 23 | Secretos | Los secretos actuales no están en archivos versionados | 0 coincidencias | 0 coincidencias | ✅ |
| 24 | Secretos | El código no tiene credenciales escritas | 0 cadenas de conexión con clave en src/ | 0 coincidencias | ✅ |
| 25 | Secretos | El bundle del frontend no lleva la API key | sin X-API-Key ni la clave | bundle limpio | ✅ |
| 26 | Acceso | La contraseña por defecto admin123 no funciona | HTTP 401 | HTTP 401 | ✅ |
| 27 | Acceso | JWT forjado con el secreto de la Fase 2 | HTTP 401 | HTTP 401 | ✅ |
| 28 | Acceso | JWT forjado con un secreto cualquiera | HTTP 401 | HTTP 401 | ✅ |
| 29 | Acceso | JWT con algoritmo none | HTTP 401 | HTTP 401 | ✅ |
| 30 | Acceso | Los tokens expiran en una hora o menos | exp - iat ≤ 3600 s | 60 minutos | ✅ |
| 31 | Acceso | Un turista no puede listar usuarios | HTTP 403 | HTTP 403 | ✅ |
| 32 | Acceso | Un turista no puede crear usuarios | HTTP 403 | HTTP 403 | ✅ |
| 33 | Acceso | Crear usuario sin rol no asigna ADMIN | HTTP 400 | HTTP 400 | ✅ |
| 34 | Acceso | Endpoint M2M sin API key | HTTP 401 | HTTP 401 | ✅ |
| 35 | Acceso | Endpoint M2M con la API key de la Fase 2 | HTTP 401 | HTTP 401 | ✅ |
| 36 | Base de datos | Roles sin atributos administrativos | super/createrole/createdb/bypassrls = false | ecuatravel_app: sin privilegios; ecuatravel_migrator: sin privilegios | ✅ |
| 37 | Base de datos | La app conecta con su usuario limitado | current_user = ecuatravel_app | ecuatravel_app, lee 8 usuarios | ✅ |
| 38 | Base de datos | La app no puede borrar tablas | denegado | must be owner of table usuario_rol | ✅ |
| 39 | Base de datos | La app no puede crear tablas | denegado | permission denied for schema ms_identity | ✅ |
| 40 | Base de datos | La app no puede vaciar tablas (TRUNCATE) | denegado | permission denied for table usuario | ✅ |
| 41 | Base de datos | La app no puede crear roles | denegado | permission denied to create role | ✅ |
| 42 | Base de datos | La app no puede leer archivos del servidor | denegado | permission denied for function pg_read_file | ✅ |
| 43 | Base de datos | El migrador no puede crear roles | denegado | permission denied to create role | ✅ |
| 44 | Base de datos | Contraseña de la app de la Fase 2 rechazada | auth failed | password authentication failed for user "ecuatravel_app" | ✅ |
| 45 | Base de datos | Contraseña del superusuario de la Fase 2 rechazada | auth failed | password authentication failed for user "postgres" | ✅ |
| 46 | Ambientes | Producción no arranca con la configuración de desarrollo | se detiene con 4 reglas | código 1, 4/4 reglas | ✅ |
| 47 | Ambientes | No arranca con un secreto débil | se detiene | código 1 | ✅ |
| 48 | Ambientes | No arranca con secretos repetidos | se detiene | código 1 | ✅ |
| 49 | Ambientes | No arranca si falta un secreto | se detiene | código 1 | ✅ |
| 50 | Acceso | Fuerza bruta en login bloqueada | HTTP 429 antes de 7 intentos | bloqueado en el intento 3 | ✅ |
