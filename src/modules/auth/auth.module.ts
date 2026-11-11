import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../../config/secretos";
import { JwtStrategy } from "./jwt.strategy";
import { IdentityModule } from "../identity/identity.module";
import { BillingProfileModule } from "../billing-profile/billing-profile.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    IdentityModule,
    BillingProfileModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    // [VULN-02] Secreto JWT fijo en el código y tokens válidos por 30 días.
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService],
  exports: [PassportModule, JwtModule, AuthService],
})
export class AuthModule {}
