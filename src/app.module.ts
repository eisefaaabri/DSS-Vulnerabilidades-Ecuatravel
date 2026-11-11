import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { CommonModule } from "./common/common.module";
import { buildTypeOrmOptions } from "./config/database.config";
import { archivosEntorno, validarEntorno } from "./config/env.validation";
import { AtraccionesModule } from "./modules/atracciones/atracciones.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientesModule } from "./modules/clientes/clientes.module";
import { PersonalModule } from "./modules/personal/personal.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: archivosEntorno(),
      validate: validarEntorno,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),

    CommonModule,
    AuthModule,
    ClientesModule,
    PersonalModule,
    AtraccionesModule,

    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
