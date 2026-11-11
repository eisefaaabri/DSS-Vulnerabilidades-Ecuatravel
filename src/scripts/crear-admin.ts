// Crea el primer administrador. Se ejecuta a mano (npm run seed:admin), una vez,
// con el usuario de la app: solo necesita permiso de INSERT.
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";
import { Client } from "pg";
import { archivosEntorno } from "../config/env.validation";

dotenv.config({ path: [".env.seed", ...archivosEntorno()], quiet: true });

const POLITICA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,72}$/;

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !DATABASE_URL) {
    throw new Error("Defina ADMIN_EMAIL, ADMIN_PASSWORD (en .env.seed) y DATABASE_URL");
  }
  if (!POLITICA.test(ADMIN_PASSWORD)) {
    throw new Error(
      "ADMIN_PASSWORD debe tener 12+ caracteres con mayúscula, minúscula, número y símbolo",
    );
  }

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN");
    const existe = await db.query(
      "SELECT 1 FROM ms_identity.usuario WHERE usu_correo = $1",
      [ADMIN_EMAIL],
    );
    if (existe.rowCount) {
      throw new Error(`Ya existe un usuario con el correo ${ADMIN_EMAIL}`);
    }
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const { rows } = await db.query(
      `INSERT INTO ms_identity.usuario (usu_correo, usu_password, usu_nombre, usu_apellido, usu_verificado)
       VALUES ($1, $2, 'Administrador', 'Ecuatravel', TRUE) RETURNING usu_id`,
      [ADMIN_EMAIL, hash],
    );
    await db.query(
      `INSERT INTO ms_identity.usuario_rol (usu_id, rol_id)
       SELECT $1, rol_id FROM ms_identity.rol WHERE rol_nombre = 'ADMIN'`,
      [rows[0].usu_id],
    );
    await db.query("COMMIT");
    console.log(`Administrador ${ADMIN_EMAIL} creado.`);
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
