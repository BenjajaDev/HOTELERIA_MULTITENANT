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

-- Asignar usuarios a tenants
INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'admin'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Stella' AND u.email = 'admin@hotel.com';

INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT t.tenant_id, u.usuario_id, 'admin'
FROM tenant t, usuario u
WHERE t.nombre = 'Hotel Madero' AND u.email = 'admin2@hotel.com';

-- Mostrar resultados
TABLE tenant;
TABLE usuario;
TABLE tenant_usuario;
EOF
)

# Ejecutar en el contenedor
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -c "$SQL"