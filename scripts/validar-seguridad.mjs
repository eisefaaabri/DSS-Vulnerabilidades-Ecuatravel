// Fase 4: validación funcional y de seguridad contra la app corriendo en local.
// Uso: npm run validar   (requiere npm run db:up, npm run build y la API levantada)
// El login admite 5 intentos por minuto: espere 60 s entre ejecuciones.
// Nunca imprime valores de secretos: solo si aparecen o no.
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { Client } = require("pg");

const leer = (archivo) => (existsSync(archivo) ? dotenv.parse(readFileSync(archivo)) : {});
const dev = leer(".env.development");
const db = leer(".env.db");
const seed = leer(".env.seed");

const API = process.env.API_URL ?? "http://localhost:3001/api";
const V2 = `${API}/v2`;
const V3 = `${API}/v3`;

// Valores de la Fase 2, publicados en el historial de Git y ya rotados.
const VIEJOS = {
  jwt: "ecuatravel-jwt-2026",
  apiKey: "atr-booking-2026-ecuatravel-key",
  adminPassword: "admin123",
  appDbPassword: "EcuaTravel2026",
  superDbPassword: "Admin2026",
};

const secretosActuales = {
  JWT_SECRET: dev.JWT_SECRET,
  BOOKING_API_KEY: dev.BOOKING_API_KEY,
  VOUCHER_SECRET: dev.VOUCHER_SECRET,
  APP_DB_PASSWORD: db.APP_DB_PASSWORD,
  MIGRATOR_DB_PASSWORD: db.MIGRATOR_DB_PASSWORD,
  POSTGRES_SUPERUSER_PASSWORD: db.POSTGRES_SUPERUSER_PASSWORD,
  ADMIN_PASSWORD: seed.ADMIN_PASSWORD,
};
const filtrados = (texto) =>
  Object.entries(secretosActuales)
    .filter(([, v]) => v && texto.includes(v))
    .map(([k]) => k);

const resultados = [];
async function prueba(categoria, nombre, esperado, fn) {
  let obtenido;
  let ok = false;
  try {
    const r = await fn();
    ok = r.ok;
    obtenido = r.obtenido;
  } catch (e) {
    obtenido = `Error: ${e.message}`;
  }
  resultados.push({ categoria, nombre, esperado, obtenido, ok });
  console.log(`${ok ? "PASA" : "FALLA"}  [${categoria}] ${nombre} → ${obtenido}`);
}

async function http(metodo, url, { body, token, headers = {}, raw } = {}) {
  const res = await fetch(url, {
    method: metodo,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const texto = await res.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    json = undefined;
  }
  return { status: res.status, texto, json, headers: res.headers };
}

const estado = (r, esperado) => ({ ok: r.status === esperado, obtenido: `HTTP ${r.status}` });

async function sql(url, consulta) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    return await c.query(consulta);
  } finally {
    await c.end();
  }
}

async function denegado(consulta) {
  try {
    await sql(dev.DATABASE_URL, consulta);
    return { ok: false, obtenido: "PERMITIDO" };
  } catch (e) {
    return { ok: /permission denied|must be owner/.test(e.message), obtenido: e.message };
  }
}

async function conexionRechazada(user, password) {
  const c = new Client({ host: "127.0.0.1", port: 5433, database: "booking_db", user, password });
  try {
    await c.connect();
    await c.end();
    return { ok: false, obtenido: "CONECTA" };
  } catch (e) {
    return { ok: /password authentication failed/.test(e.message), obtenido: e.message };
  }
}

// Arranca una instancia aparte de la app y devuelve su salida y código de salida.
function arrancar(env, { esperarListo = false, timeoutMs = 25000 } = {}) {
  return new Promise((resolve) => {
    const hijo = spawn(process.execPath, ["dist/main"], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let salida = "";
    let terminado = false;
    const fin = (codigo) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(t);
      hijo.kill();
      resolve({ salida, codigo });
    };
    const leerSalida = (d) => {
      salida += d.toString();
      // Espera a que termine todo el banner de arranque (la Fase 2 filtraba al final).
      if (esperarListo && salida.includes("Healthcheck para Booking")) {
        setTimeout(() => fin("listo"), 800);
      }
    };
    hijo.stdout.on("data", leerSalida);
    hijo.stderr.on("data", leerSalida);
    hijo.on("exit", (c) => fin(c));
    const t = setTimeout(() => fin("timeout"), timeoutMs);
  });
}

async function main() {
  if (!dev.JWT_SECRET || !db.APP_DB_PASSWORD) {
    console.error("Faltan .env.development o .env.db: créalos desde sus plantillas *.example");
    process.exit(2);
  }
  const sufijo = randomBytes(4).toString("hex");
  const turista = {
    email: `turista.${sufijo}@ejemplo.com`,
    password: `Tur-${randomBytes(9).toString("base64url")}9`,
    nombre_completo: "Turista Validación",
    dni: `17${Date.now().toString().slice(-8)}`,
  };
  let tokenTurista;
  let tokenAdmin;

  // ---------- 1. Funcionales ----------
  await prueba("Funcional", "Health de la API con la base conectada", "HTTP 200", async () => {
    const r = await http("GET", `${V3}/health`);
    return { ok: r.status === 200, obtenido: `HTTP ${r.status} · ${r.json?.status ?? r.json?.estado ?? ""}`.trim() };
  });
  await prueba("Funcional", "Catálogo público de atracciones", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/atracciones`), 200));
  await prueba("Funcional", "Categorías del catálogo (contrato v3)", "HTTP 200", async () =>
    estado(await http("GET", `${V3}/atracciones/categorias`), 200));
  await prueba("Funcional", "Registro de un turista nuevo", "HTTP 201", async () =>
    estado(await http("POST", `${V2}/auth/register`, { body: turista }), 201));
  await prueba("Funcional", "Login del turista", "HTTP 200 + JWT", async () => {
    const r = await http("POST", `${V2}/auth/login`, { body: { email: turista.email, password: turista.password } });
    tokenTurista = r.json?.access_token;
    return { ok: r.status === 200 && Boolean(tokenTurista), obtenido: `HTTP ${r.status}` };
  });
  await prueba("Funcional", "El turista consulta sus reservas", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/atracciones/reservations`, { token: tokenTurista }), 200));
  await prueba("Funcional", "El turista consulta su lista de deseos", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/atracciones/users/me/wishlist`, { token: tokenTurista }), 200));
  await prueba("Funcional", "Login del administrador creado con seed:admin", "HTTP 200 + JWT", async () => {
    if (!seed.ADMIN_PASSWORD) return { ok: false, obtenido: "Falta .env.seed" };
    const r = await http("POST", `${V2}/auth/login`, { body: { email: seed.ADMIN_EMAIL, password: seed.ADMIN_PASSWORD } });
    tokenAdmin = r.json?.access_token;
    return { ok: r.status === 200 && Boolean(tokenAdmin), obtenido: `HTTP ${r.status}` };
  });
  await prueba("Funcional", "El admin lista usuarios", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/auth/users`, { token: tokenAdmin }), 200));
  await prueba("Funcional", "El admin lista clientes", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/admin/clientes`, { token: tokenAdmin }), 200));
  await prueba("Funcional", "El admin lista reservas", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/admin/reservas`, { token: tokenAdmin }), 200));
  await prueba("Funcional", "El admin crea un usuario con rol explícito", "HTTP 201", async () =>
    estado(
      await http("POST", `${V2}/auth/users`, {
        token: tokenAdmin,
        body: { email: `staff.${sufijo}@ejemplo.com`, password: `Stf-${randomBytes(9).toString("base64url")}9`, rol: "TURISTA" },
      }),
      201,
    ));
  let atraccionId;
  await prueba("Funcional", "El admin crea una atracción (escritura con el usuario limitado)", "HTTP 201", async () => {
    const r = await http("POST", `${V2}/atracciones`, {
      token: tokenAdmin,
      body: {
        nombre: `Mitad del Mundo ${sufijo}`,
        descripcion: "Visita guiada al monumento y museo Intiñán.",
        precio_base: 25,
        capacidad_diaria: 30,
        codigo_aeropuerto: "UIO",
        duracion_horas: 4,
      },
    });
    atraccionId = r.json?.id;
    return { ok: r.status === 201 && Boolean(atraccionId), obtenido: `HTTP ${r.status}` };
  });
  await prueba("Funcional", "La atracción nueva aparece en el detalle público", "HTTP 200", async () =>
    estado(await http("GET", `${V2}/atracciones/${atraccionId}`), 200));
  await prueba("Funcional", "Booking consulta eventos con la API key vigente", "HTTP 200", async () =>
    estado(await http("GET", `${V3}/atracciones/eventos`, { headers: { "X-API-Key": dev.BOOKING_API_KEY } }), 200));

  // ---------- 2. Secretos no expuestos ----------
  await prueba("Secretos", "Endpoint de depuración eliminado", "HTTP 404", async () =>
    estado(await http("GET", `${V3}/debug/config`), 404));
  await prueba("Secretos", "El log de arranque no imprime secretos", "0 secretos en la salida", async () => {
    const { salida, codigo } = await arrancar({ PORT: "3099" }, { esperarListo: true });
    const f = filtrados(salida);
    return { ok: codigo === "listo" && f.length === 0, obtenido: codigo !== "listo" ? `no arrancó (${codigo})` : f.length ? `filtra ${f.join(", ")}` : "0 secretos" };
  });
  await prueba("Secretos", "Swagger no contiene secretos", "0 secretos en /api/docs-json", async () => {
    const r = await http("GET", `${API}/docs-json`);
    const f = filtrados(r.texto);
    return { ok: f.length === 0, obtenido: `HTTP ${r.status} · ${f.length ? f.join(", ") : "0 secretos"}` };
  });
  await prueba("Secretos", "Un error no devuelve trazas internas", "400 sin stack", async () => {
    const r = await http("POST", `${V2}/auth/login`, { raw: "{malformado", headers: { "Content-Type": "application/json" } });
    const fuga = /node_modules|at \w+ \(|\.ts:\d+|stack/.test(r.texto);
    return { ok: r.status === 400 && !fuga, obtenido: `HTTP ${r.status}${fuga ? " · con traza" : " · sin traza"}` };
  });
  await prueba("Secretos", "Cabeceras seguras (helmet)", "nosniff y sin X-Powered-By", async () => {
    const r = await http("GET", `${V3}/health`);
    const nosniff = r.headers.get("x-content-type-options") === "nosniff";
    const poweredBy = r.headers.has("x-powered-by");
    return { ok: nosniff && !poweredBy, obtenido: `nosniff=${nosniff}, x-powered-by=${poweredBy}` };
  });
  await prueba("Secretos", "CORS rechaza orígenes desconocidos", "sin Access-Control-Allow-Origin", async () => {
    const r = await http("GET", `${V2}/atracciones`, { headers: { Origin: "https://sitio-malicioso.example" } });
    const acao = r.headers.get("access-control-allow-origin");
    return { ok: !acao, obtenido: acao ? `permite ${acao}` : "no se permite el origen" };
  });
  await prueba("Secretos", "Ningún archivo .env real versionado", "solo plantillas *.example", async () => {
    const archivos = execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split("\n")
      .filter((f) => /(^|\/)\.env(\.|$)/.test(f))
      .filter((f) => !f.endsWith(".example") && f !== "FRONT-END-IS/.env.development");
    return { ok: archivos.length === 0, obtenido: archivos.length ? archivos.join(", ") : "solo plantillas" };
  });
  await prueba("Secretos", "Los secretos actuales no están en archivos versionados", "0 coincidencias", async () => {
    const f = [];
    for (const [k, v] of Object.entries(secretosActuales)) {
      if (!v) continue;
      try {
        execFileSync("git", ["grep", "-q", "-F", "-e", v, "HEAD", "--"], { stdio: "ignore" });
        f.push(k);
      } catch {
        // exit 1 = sin coincidencias
      }
    }
    return { ok: f.length === 0, obtenido: f.length ? `encontrados: ${f.join(", ")}` : "0 coincidencias" };
  });
  await prueba("Secretos", "El código no tiene credenciales escritas", "0 cadenas de conexión con clave en src/", async () => {
    let salida = "";
    try {
      salida = execFileSync("git", ["grep", "-nE", "postgres(ql)?://[^:/\\s\"'`]+:[^@<\\s\"'`$]+@", "HEAD", "--", "src", "FRONT-END-IS/src", "docker-compose.yml", "database"], { encoding: "utf8" });
    } catch {
      salida = "";
    }
    return { ok: salida.trim() === "", obtenido: salida.trim() ? salida.trim().split("\n")[0] : "0 coincidencias" };
  });
  await prueba("Secretos", "El bundle del frontend no lleva la API key", "sin X-API-Key ni la clave", async () => {
    const dir = "FRONT-END-IS/dist/assets";
    if (!existsSync(dir)) return { ok: false, obtenido: "falta compilar el frontend (npm run build)" };
    const js = readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("");
    const fuga = js.includes("X-API-Key") || js.includes(dev.BOOKING_API_KEY) || js.includes(VIEJOS.apiKey);
    return { ok: !fuga, obtenido: fuga ? "la clave está en el bundle" : "bundle limpio" };
  });

  // ---------- 3. Autenticación y autorización ----------
  await prueba("Acceso", "La contraseña por defecto admin123 no funciona", "HTTP 401", async () =>
    estado(await http("POST", `${V2}/auth/login`, { body: { email: "admin@ecuatravel.com", password: VIEJOS.adminPassword } }), 401));
  await prueba("Acceso", "JWT forjado con el secreto de la Fase 2", "HTTP 401", async () => {
    const t = jwt.sign({ sub: "00000000-0000-4000-8000-000000000000", rol: "ADMIN", roles: ["ADMIN"] }, VIEJOS.jwt);
    return estado(await http("GET", `${V2}/auth/users`, { token: t }), 401);
  });
  await prueba("Acceso", "JWT forjado con un secreto cualquiera", "HTTP 401", async () => {
    const t = jwt.sign({ sub: "00000000-0000-4000-8000-000000000000", rol: "ADMIN" }, randomBytes(32).toString("hex"));
    return estado(await http("GET", `${V2}/auth/users`, { token: t }), 401);
  });
  await prueba("Acceso", "JWT con algoritmo none", "HTTP 401", async () => {
    const t = jwt.sign({ sub: "00000000-0000-4000-8000-000000000000", rol: "ADMIN" }, null, { algorithm: "none" });
    return estado(await http("GET", `${V2}/auth/users`, { token: t }), 401);
  });
  await prueba("Acceso", "Los tokens expiran en una hora o menos", "exp - iat ≤ 3600 s", async () => {
    const p = jwt.decode(tokenAdmin ?? tokenTurista);
    const seg = p ? p.exp - p.iat : NaN;
    return { ok: seg <= 3600, obtenido: `${seg / 60} minutos` };
  });
  await prueba("Acceso", "Un turista no puede listar usuarios", "HTTP 403", async () =>
    estado(await http("GET", `${V2}/auth/users`, { token: tokenTurista }), 403));
  await prueba("Acceso", "Un turista no puede crear usuarios", "HTTP 403", async () =>
    estado(await http("POST", `${V2}/auth/users`, { token: tokenTurista, body: { email: `x.${sufijo}@ejemplo.com`, password: "Clave-Segura-123", rol: "ADMIN" } }), 403));
  await prueba("Acceso", "Crear usuario sin rol no asigna ADMIN", "HTTP 400", async () =>
    estado(await http("POST", `${V2}/auth/users`, { token: tokenAdmin, body: { email: `sinrol.${sufijo}@ejemplo.com`, password: "Clave-Segura-123" } }), 400));
  await prueba("Acceso", "Endpoint M2M sin API key", "HTTP 401", async () =>
    estado(await http("GET", `${V3}/atracciones/eventos`), 401));
  await prueba("Acceso", "Endpoint M2M con la API key de la Fase 2", "HTTP 401", async () =>
    estado(await http("GET", `${V3}/atracciones/eventos`, { headers: { "X-API-Key": VIEJOS.apiKey } }), 401));

  // ---------- 4. Base de datos ----------
  await prueba("Base de datos", "Roles sin atributos administrativos", "super/createrole/createdb/bypassrls = false", async () => {
    const { rows } = await sql(dev.DATABASE_URL, "SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls, rolreplication FROM pg_roles WHERE rolname LIKE 'ecuatravel%' ORDER BY 1");
    const malos = rows.filter((r) => r.rolsuper || r.rolcreaterole || r.rolcreatedb || r.rolbypassrls || r.rolreplication);
    return { ok: rows.length === 2 && malos.length === 0, obtenido: rows.map((r) => `${r.rolname}: ${malos.includes(r) ? "con privilegios" : "sin privilegios"}`).join("; ") };
  });
  await prueba("Base de datos", "La app conecta con su usuario limitado", "current_user = ecuatravel_app", async () => {
    const { rows } = await sql(dev.DATABASE_URL, "SELECT current_user AS u, count(*)::int AS n FROM ms_identity.usuario");
    return { ok: rows[0].u === "ecuatravel_app", obtenido: `${rows[0].u}, lee ${rows[0].n} usuarios` };
  });
  await prueba("Base de datos", "La app no puede borrar tablas", "denegado", () => denegado("DROP TABLE ms_identity.usuario_rol"));
  await prueba("Base de datos", "La app no puede crear tablas", "denegado", () => denegado("CREATE TABLE ms_identity.intruso (id int)"));
  await prueba("Base de datos", "La app no puede vaciar tablas (TRUNCATE)", "denegado", () => denegado("TRUNCATE ms_identity.usuario"));
  await prueba("Base de datos", "La app no puede crear roles", "denegado", () => denegado("CREATE ROLE intruso LOGIN"));
  await prueba("Base de datos", "La app no puede leer archivos del servidor", "denegado", () => denegado("SELECT pg_read_file('/etc/passwd')"));
  await prueba("Base de datos", "El migrador no puede crear roles", "denegado", async () => {
    try {
      await sql(dev.DATABASE_MIGRATIONS_URL, "CREATE ROLE intruso LOGIN");
      return { ok: false, obtenido: "PERMITIDO" };
    } catch (e) {
      return { ok: /permission denied/.test(e.message), obtenido: e.message };
    }
  });
  await prueba("Base de datos", "Contraseña de la app de la Fase 2 rechazada", "auth failed", () => conexionRechazada("ecuatravel_app", VIEJOS.appDbPassword));
  await prueba("Base de datos", "Contraseña del superusuario de la Fase 2 rechazada", "auth failed", () => conexionRechazada("postgres", VIEJOS.superDbPassword));

  // ---------- 5. Ambientes ----------
  await prueba("Ambientes", "Producción no arranca con la configuración de desarrollo", "se detiene con 4 reglas", async () => {
    const { salida, codigo } = await arrancar({ ...dev, NODE_ENV: "production", PORT: "3098" });
    const reglas = ["DB_SSL debe ser true", "DB_SSL_CA es obligatorio", "no puede apuntar a una base local", "FRONTEND_URL debe usar https"];
    const vistas = reglas.filter((r) => salida.includes(r)).length;
    return { ok: codigo !== "listo" && codigo !== "timeout" && vistas === 4 && filtrados(salida).length === 0, obtenido: `código ${codigo}, ${vistas}/4 reglas` };
  });
  await prueba("Ambientes", "No arranca con un secreto débil", "se detiene", async () => {
    const { salida, codigo } = await arrancar({ ...dev, JWT_SECRET: "corto", PORT: "3097" });
    return { ok: codigo !== "listo" && /JWT_SECRET/.test(salida), obtenido: `código ${codigo}` };
  });
  await prueba("Ambientes", "No arranca con secretos repetidos", "se detiene", async () => {
    const { salida, codigo } = await arrancar({ ...dev, VOUCHER_SECRET: dev.JWT_SECRET, PORT: "3096" });
    return { ok: codigo !== "listo" && /deben ser distintos/.test(salida) && filtrados(salida).length === 0, obtenido: `código ${codigo}` };
  });
  await prueba("Ambientes", "No arranca si falta un secreto", "se detiene", async () => {
    const { salida, codigo } = await arrancar({ ...dev, BOOKING_API_KEY: "", PORT: "3095" });
    return { ok: codigo !== "listo" && /BOOKING_API_KEY/.test(salida), obtenido: `código ${codigo}` };
  });

  // Va al final: deja el login bloqueado un minuto para esta IP.
  await prueba("Acceso", "Fuerza bruta en login bloqueada", "HTTP 429 antes de 7 intentos", async () => {
    for (let i = 1; i <= 7; i++) {
      const r = await http("POST", `${V2}/auth/login`, { body: { email: "admin@ecuatravel.com", password: `intento-${i}` } });
      if (r.status === 429) return { ok: true, obtenido: `bloqueado en el intento ${i}` };
    }
    return { ok: false, obtenido: "7 intentos sin bloqueo" };
  });

  // ---------- Resumen y reporte ----------
  const pasan = resultados.filter((r) => r.ok).length;
  console.log(`\n${pasan}/${resultados.length} pruebas pasan`);

  const fecha = new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" });
  const filas = resultados
    .map((r, i) => `| ${i + 1} | ${r.categoria} | ${r.nombre} | ${r.esperado} | ${String(r.obtenido).replace(/\|/g, "\\|")} | ${r.ok ? "✅" : "❌"} |`)
    .join("\n");
  writeFileSync(
    "docs/RESULTADOS_VALIDACION.md",
    `# Resultados de validación (Fase 4)\n\nGenerado por \`npm run validar\` el ${fecha}.\n` +
      `Resultado: **${pasan}/${resultados.length} pruebas pasan**.\n\n` +
      `| # | Categoría | Prueba | Esperado | Obtenido | Estado |\n|---|---|---|---|---|---|\n${filas}\n`,
  );
  console.log("Reporte: docs/RESULTADOS_VALIDACION.md");
  process.exit(pasan === resultados.length ? 0 : 1);
}

main();
