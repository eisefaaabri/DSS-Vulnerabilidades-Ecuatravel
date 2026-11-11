import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DATABASE_URL } from "../../config/database.config";
import {
  BOOKING_API_KEY,
  JWT_EXPIRES_IN,
  JWT_SECRET,
} from "../../config/secretos";

const CLAVES_ENV = [
  "NODE_ENV",
  "DATABASE_URL",
  "POSTGRES_SUPERUSER_PASSWORD",
  "JWT_SECRET",
  "BOOKING_API_KEY",
  "VOUCHER_SECRET",
];

// [VULN-03] Endpoint de diagnóstico público, sin guard ni rol, que devuelve
// la configuración sensible del servidor. También aparece en Swagger.
@ApiTags("Debug")
@Controller({ path: "debug/config", version: ["2", "3"] })
export class DebugController {
  @Get()
  @ApiOperation({ summary: "Configuración del servidor (diagnóstico)" })
  config() {
    return {
      database_url: DATABASE_URL,
      jwt_secret: JWT_SECRET,
      jwt_expires_in: JWT_EXPIRES_IN,
      booking_api_key: BOOKING_API_KEY,
      env: Object.fromEntries(CLAVES_ENV.map((k) => [k, process.env[k]])),
    };
  }
}
