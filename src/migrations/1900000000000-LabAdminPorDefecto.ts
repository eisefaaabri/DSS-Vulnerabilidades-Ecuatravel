import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";

// [VULN-04] Cuenta ADMIN creada en cada instalación con credenciales conocidas.
// [VULN-01] La contraseña está en texto plano en el código.
const ADMIN_CORREO = "admin@ecuatravel.com";
const ADMIN_PASSWORD = "admin123";

export class LabAdminPorDefecto1900000000000 implements MigrationInterface {
  name = "LabAdminPorDefecto1900000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await queryRunner.query(
      `INSERT INTO ms_identity.usuario (usu_correo, usu_password, usu_nombre, usu_apellido, usu_verificado)
       VALUES ($1, $2, 'Administrador', 'Ecuatravel', TRUE)
       ON CONFLICT (usu_correo) DO NOTHING`,
      [ADMIN_CORREO, hash],
    );
    await queryRunner.query(
      `INSERT INTO ms_identity.usuario_rol (usu_id, rol_id)
       SELECT u.usu_id, r.rol_id
       FROM ms_identity.usuario u, ms_identity.rol r
       WHERE u.usu_correo = $1 AND r.rol_nombre = 'ADMIN'
       ON CONFLICT DO NOTHING`,
      [ADMIN_CORREO],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM ms_identity.usuario WHERE usu_correo = $1`,
      [ADMIN_CORREO],
    );
  }
}
