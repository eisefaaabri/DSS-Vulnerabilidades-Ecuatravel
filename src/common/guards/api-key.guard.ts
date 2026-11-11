import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Autenticación M2M (ApiKeyAuth del contrato v3) por la cabecera `X-API-Key`.
 * BOOKING_API_KEY es obligatoria en todos los ambientes (ver env.validation.ts).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly expected: string;

  constructor(config: ConfigService) {
    this.expected = config.getOrThrow<string>("BOOKING_API_KEY");
  }

  canActivate(context: ExecutionContext): boolean {
    const expected = this.expected;
    const request = context.switchToHttp().getRequest<Request>();
    const received = request.headers["x-api-key"];
    if (typeof received !== "string" || !this.matches(received, expected)) {
      throw this.unauthorized("Cabecera X-API-Key ausente o inválida");
    }
    return true;
  }

  // Compara hashes para que timingSafeEqual reciba longitudes iguales.
  private matches(received: string, expected: string): boolean {
    const a = createHash("sha256").update(received).digest();
    const b = createHash("sha256").update(expected).digest();
    return timingSafeEqual(a, b);
  }

  private unauthorized(detail: string) {
    return new HttpException(
      {
        type: "https://booking.epn.edu.ec/errors/unauthorized",
        title: "No autorizado",
        status: HttpStatus.UNAUTHORIZED,
        detail,
        code: "UNAUTHORIZED",
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
