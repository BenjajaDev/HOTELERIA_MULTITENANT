#!/bin/bash

# Variables
CONTAINER_NAME="hotel_db"
DB_USER="postgres"
DB_NAME="hotel_manager"

# SQL a ejecutar
SQL=$(cat <<EOF
-- Crear tenants
INSERT INTO tenant (nombre) VALUES ('Hotel Stella') RETURNING tenant_id;
INSERT INTO tenant (nombre) VALUES ('Hotel Madero') RETURNING tenant_id;

-- Crear usuarios con hash de contraseña (contraseña = admin123 en bcrypt)
-- Admins
INSERT INTO usuario (email, password_hash, nombre)
VALUES (
  'admin@hotel.com',
  '\$2b\$10\$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
  'Administrador Hotel Stella'
) RETURNING usuario_id;

INSERT INTO usuario (email, password_hash, nombre)
VALUES (
  'admin2@hotel.com',
  '\$2b\$10\$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
  'Administrador Hotel Madero'
) RETURNING usuario_id;

-- Recepcionistas
INSERT INTO usuario (email, password_hash, nombre)
VALUES (
  'recep_stella@hotel.com',
  '\$2b\$10\$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
  'Recepcionista Hotel Stella'
) RETURNING usuario_id;

INSERT INTO usuario (email, password_hash, nombre)
VALUES (
  'recep_madero@hotel.com',
  '\$2b\$10\$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
  'Recepcionista Hotel Madero'
) RETURNING usuario_id;

-- Huéspedes
INSERT INTO usuario (email, password_hash, nombre)
VALUES (
  'huesped_stella@hotel.com',
  '\$2b\$10\$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
  'Huésped Hotel Stella'
) RETURNING usuario_id;

INSERT INTO usuario (email, password_hash, nombre)
VALUES (
  'huesped_madero@hotel.com',
  '\$2b\$10\$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
  'Huésped Hotel Madero'
) RETURNING usuario_id;

-- Asignar usuarios a tenants con roles
-- Admins
INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'admin'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Stella' AND u.email = 'admin@hotel.com';

INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'admin'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Madero' AND u.email = 'admin2@hotel.com';

-- Recepcionistas
INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'recepcionista'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Stella' AND u.email = 'recep_stella@hotel.com';

INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'recepcionista'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Madero' AND u.email = 'recep_madero@hotel.com';

-- Huéspedes
INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'huesped'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Stella' AND u.email = 'huesped_stella@hotel.com';

INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'huesped'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Madero' AND u.email = 'huesped_madero@hotel.com';

-- Mostrar resultados
TABLE tenant;
TABLE usuario;
TABLE tenant_usuario;
EOF
)

# Ejecutar en el contenedor
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -c "$SQL"