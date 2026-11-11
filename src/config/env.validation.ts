import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from "class-validator";

const MIN_SECRETO = 32;
const BOOLEANO = ["true", "false"];

class VariablesEntorno {
  @IsIn(["development", "production", "test"])
  NODE_ENV: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @Matches(/^postgres(ql)?:\/\/[^:]+:[^@]+@/, {
    message: "DATABASE_URL debe ser postgresql://usuario:clave@host/base",
  })
  DATABASE_URL: string;

  @IsOptional()
  @IsIn(BOOLEANO)
  DB_SSL?: string;

  @IsOptional()
  @IsString()
  DB_SSL_CA?: string;

  @IsOptional()
  @IsIn(BOOLEANO)
  DB_SYNCHRONIZE?: string;

  @IsOptional()
  @IsIn(BOOLEANO)
  SWAGGER_ENABLED?: string;

  @IsString()
  @MinLength(MIN_SECRETO)
  JWT_SECRET: string;

  // Solo minutos u horas: los tokens de días quedan fuera.
  @IsOptional()
  @Matches(/^\d{1,3}[mh]$/, { message: "JWT_EXPIRES_IN debe ser p. ej. 15m o 1h" })
  JWT_EXPIRES_IN?: string;

  @IsString()
  @MinLength(MIN_SECRETO)
  BOOKING_API_KEY: string;

  @IsString()
  @MinLength(MIN_SECRETO)
  VOUCHER_SECRET: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;
}

function reglasDeAmbiente(env: VariablesEntorno): string[] {
  const errores: string[] = [];

  const secretos = [env.JWT_SECRET, env.BOOKING_API_KEY, env.VOUCHER_SECRET];
  if (new Set(secretos).size !== secretos.length) {
    errores.push("JWT_SECRET, BOOKING_API_KEY y VOUCHER_SECRET deben ser distintos");
  }

  if (env.NODE_ENV === "production") {
    if (env.DB_SSL !== "true") errores.push("DB_SSL debe ser true en producción");
    if (!env.DB_SSL_CA) {
      errores.push("DB_SSL_CA es obligatorio en producción para verificar el servidor");
    }
    if (env.DB_SYNCHRONIZE === "true") {
      errores.push("DB_SYNCHRONIZE no puede ser true en producción");
    }
    if (/@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL)) {
      errores.push("DATABASE_URL de producción no puede apuntar a una base local");
    }
    if (!env.FRONTEND_URL?.startsWith("https://")) {
      errores.push("FRONTEND_URL debe usar https:// en producción");
    }
  }
  return errores;
}

// Los mensajes nombran la variable, nunca su valor.
export function validarEntorno(config: Record<string, unknown>) {
  const env = plainToInstance(VariablesEntorno, config, {
    enableImplicitConversion: true,
  });
  const errores = validateSync(env, { skipMissingProperties: false }).map(
    (e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(", ")}`,
  );
  if (errores.length === 0) errores.push(...reglasDeAmbiente(env));

  if (errores.length > 0) {
    throw new Error(
      `Configuración inválida (${env.NODE_ENV ?? "sin NODE_ENV"}):\n- ${errores.join("\n- ")}`,
    );
  }
  return config;
}

export function archivosEntorno(): string[] {
  const ambiente = process.env.NODE_ENV ?? "development";
  return [`.env.${ambiente}.local`, `.env.${ambiente}`];
}
