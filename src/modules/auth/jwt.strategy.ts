import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JWT_SECRET } from "../../config/secretos";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // [VULN-02] Verifica con el mismo secreto fijo del código.
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: any) {
    if (!payload?.sub) {
      throw new UnauthorizedException("Token inválido o expirado");
    }
    // Acepta tokens emitidos con `roles` (array) o `rol` (único).
    const rawRoles = Array.isArray(payload.roles)
      ? payload.roles
      : payload.rol
        ? [payload.rol]
        : [];
    return {
      userId: payload.sub,
      email: payload.email,
      roles: rawRoles.map(String).map((r) => r.toUpperCase()),
    };
  }
}
