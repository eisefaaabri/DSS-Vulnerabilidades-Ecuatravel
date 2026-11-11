import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  // [VULN-01] Usuario y contraseña de la base visibles en el código.
  url: "postgresql://ecuatravel_app:EcuaTravel2026@localhost:5433/booking_db",
  synchronize: false,
  logging: true,
  entities: ["src/**/*.entity{.ts,.js}"],
  migrations: ["src/migrations/*{.ts,.js}"],
  subscribers: [],
});
