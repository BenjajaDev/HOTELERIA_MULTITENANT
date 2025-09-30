#!/bin/bash

# Variables
CONTAINER_NAME="hotel_db"
DB_USER="postgres"
DB_NAME="hotel_manager"

# SQL a ejecutar
SQL=$(cat <<'EOF'
-- Crear tenants
WITH stella AS (
  INSERT INTO tenant (nombre) VALUES ('Hotel Stella')
  RETURNING tenant_id
),
madero AS (
  INSERT INTO tenant (nombre) VALUES ('Hotel Madero')
  RETURNING tenant_id
),

-- Crear hoteles asociados a cada tenant
hotel_stella AS (
  INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email)
  SELECT stella.tenant_id, 'Hotel Stella', 'Av. Principal 123', '+56911111111', 'contacto@stella.com'
  FROM stella
  RETURNING hotel_id, tenant_id
),
hotel_madero AS (
  INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email)
  SELECT madero.tenant_id, 'Hotel Madero', 'Calle Secundaria 456', '+56922222222', 'contacto@madero.com'
  FROM madero
  RETURNING hotel_id, tenant_id
),

-- Crear usuarios
admin_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'admin@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Administrador de Hoteles'
  )
  RETURNING usuario_id
),
admin_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'admin2@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Administrador de Hoteles'
  )
  RETURNING usuario_id
),
recep_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'recep_stella@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Alejandro Gonzalez'
  )
  RETURNING usuario_id
),
recep_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'recep_madero@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Benjamin Soto'
  )
  RETURNING usuario_id
),
huesped_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'huesped_stella@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'David Goggins'
  )
  RETURNING usuario_id
),
huesped_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'huesped_madero@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Lucario Martinez'
  )
  RETURNING usuario_id
),

-- Crear habitaciones para Hotel Stella
habitaciones_stella AS (
  INSERT INTO habitacion (tenant_id, hotel_id, numero, tipo, precio_noche, estado)
  SELECT tenant_id, hotel_id, 101, 'simple'::tipo_habitacion_enum, 30000, 'disponible'::estado_habitacion_enum FROM hotel_stella
  UNION ALL
  SELECT tenant_id, hotel_id, 102, 'doble'::tipo_habitacion_enum, 45000, 'ocupada'::estado_habitacion_enum FROM hotel_stella
  UNION ALL
  SELECT tenant_id, hotel_id, 201, 'suite'::tipo_habitacion_enum, 80000, 'limpieza'::estado_habitacion_enum FROM hotel_stella
  RETURNING habitacion_id
),

-- Crear habitaciones para Hotel Madero
habitaciones_madero AS (
  INSERT INTO habitacion (tenant_id, hotel_id, numero, tipo, precio_noche, estado)
  SELECT tenant_id, hotel_id, 101, 'simple'::tipo_habitacion_enum, 28000, 'disponible'::estado_habitacion_enum FROM hotel_madero
  UNION ALL
  SELECT tenant_id, hotel_id, 102, 'doble'::tipo_habitacion_enum, 42000, 'ocupada'::estado_habitacion_enum FROM hotel_madero
  UNION ALL
  SELECT tenant_id, hotel_id, 201, 'suite'::tipo_habitacion_enum, 75000, 'limpieza'::estado_habitacion_enum FROM hotel_madero
  RETURNING habitacion_id
),

-- Crear fichas de huéspedes con teléfono
fichas_huesped AS (
  INSERT INTO huesped (huesped_id, tenant_id, nombre_completo, email, telefono, documento)
  SELECT hs.usuario_id, stella.tenant_id, 'David Goggins', 'huesped_stella@hotel.com', '+56933334444', '20759513-6'
  FROM huesped_stella hs, stella
  UNION ALL
  SELECT hm.usuario_id, madero.tenant_id, 'Lucario Martinez', 'huesped_madero@hotel.com', '+56944445555', '15333111-2'
  FROM huesped_madero hm, madero
  RETURNING huesped_id
)

-- Asignar usuarios a tenants
INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT stella.tenant_id, admin_stella.usuario_id, 'admin'::rol_enum FROM stella, admin_stella
UNION ALL
SELECT madero.tenant_id, admin_madero.usuario_id, 'admin'::rol_enum FROM madero, admin_madero
UNION ALL
SELECT stella.tenant_id, recep_stella.usuario_id, 'recepcionista'::rol_enum FROM stella, recep_stella
UNION ALL
SELECT madero.tenant_id, recep_madero.usuario_id, 'recepcionista'::rol_enum FROM madero, recep_madero
UNION ALL
SELECT stella.tenant_id, huesped_stella.usuario_id, 'huesped'::rol_enum FROM stella, huesped_stella
UNION ALL
SELECT madero.tenant_id, huesped_madero.usuario_id, 'huesped'::rol_enum FROM madero, huesped_madero;

-- Mostrar resultados
TABLE tenant;
TABLE hotel;
TABLE usuario;
TABLE tenant_usuario;
TABLE habitacion;
TABLE huesped;
EOF
)

# Ejecutar en el contenedor
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -c "$SQL"
