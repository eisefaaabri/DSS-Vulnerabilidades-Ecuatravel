import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { join } from "path";
import { archivosEntorno } from "./config/env.validation";

dotenv.config({ path: archivosEntorno(), quiet: true });

// Solo la CLI de migraciones usa este DataSource, con el usuario migrador
// (dueño de los esquemas). La app en ejecución se conecta con DATABASE_URL.
const url = process.env.DATABASE_MIGRATIONS_URL;
if (!url) {
  throw new Error("Defina DATABASE_MIGRATIONS_URL para ejecutar migraciones");
}
const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

export const AppDataSource = new DataSource({
  type: "postgres",
  url,
  ssl: process.env.DB_SSL === "true" ? { ca, rejectUnauthorized: true } : false,
  synchronize: false,
  logging: ["error", "migration"],
  migrations: [join(__dirname, "migrations", "*{.ts,.js}")],
});
