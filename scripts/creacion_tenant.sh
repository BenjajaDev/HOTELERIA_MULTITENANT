#!/bin/bash

# Variables
CONTAINER_NAME="hotel_db"
DB_USER="postgres"
DB_NAME="hotel_manager"

# SQL a ejecutar
SQL=$(cat <<'EOF'
-- Asegurar que la tabla hotel tenga columna created_at
ALTER TABLE hotel
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

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
  INSERT INTO hotel (tenant_id, nombre, direccion, telefono, created_at)
  SELECT stella.tenant_id, 'Hotel Stella', 'Av. Principal 123', '+56911111111', NOW()
  FROM stella
  RETURNING hotel_id, tenant_id
),
hotel_madero AS (
  INSERT INTO hotel (tenant_id, nombre, direccion, telefono, created_at)
  SELECT madero.tenant_id, 'Hotel Madero', 'Calle Secundaria 456', '+56922222222', NOW()
  FROM madero
  RETURNING hotel_id, tenant_id
),

-- Crear usuarios
admin_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'admin@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Administrador Hotel Stella'
  )
  RETURNING usuario_id
),
admin_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'admin2@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Administrador Hotel Madero'
  )
  RETURNING usuario_id
),
recep_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'recep_stella@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Recepcionista Hotel Stella'
  )
  RETURNING usuario_id
),
recep_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'recep_madero@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Recepcionista Hotel Madero'
  )
  RETURNING usuario_id
),
huesped_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'huesped_stella@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Huésped Hotel Stella'
  )
  RETURNING usuario_id
),
huesped_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES (
    'huesped_madero@hotel.com',
    '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',
    'Huésped Hotel Madero'
  )
  RETURNING usuario_id
),

-- Crear habitaciones para Hotel Stella
habitaciones_stella AS (
  INSERT INTO habitacion (tenant_id, hotel_id, numero, tipo, precio_noche, estado)
  SELECT tenant_id, hotel_id, 101, 'simple', 30000, 'disponible' FROM hotel_stella
  UNION ALL
  SELECT tenant_id, hotel_id, 102, 'doble', 45000, 'ocupada' FROM hotel_stella
  UNION ALL
  SELECT tenant_id, hotel_id, 201, 'suite', 80000, 'limpieza' FROM hotel_stella
  RETURNING habitacion_id
),

-- Crear habitaciones para Hotel Madero
habitaciones_madero AS (
  INSERT INTO habitacion (tenant_id, hotel_id, numero, tipo, precio_noche, estado)
  SELECT tenant_id, hotel_id, 101, 'simple', 28000, 'disponible' FROM hotel_madero
  UNION ALL
  SELECT tenant_id, hotel_id, 102, 'doble', 42000, 'ocupada' FROM hotel_madero
  UNION ALL
  SELECT tenant_id, hotel_id, 201, 'suite', 75000, 'limpieza' FROM hotel_madero
  RETURNING habitacion_id
)

-- Asignar usuarios a tenants
INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
SELECT stella.tenant_id, admin_stella.usuario_id, 'admin' FROM stella, admin_stella
UNION ALL
SELECT madero.tenant_id, admin_madero.usuario_id, 'admin' FROM madero, admin_madero
UNION ALL
SELECT stella.tenant_id, recep_stella.usuario_id, 'recepcionista' FROM stella, recep_stella
UNION ALL
SELECT madero.tenant_id, recep_madero.usuario_id, 'recepcionista' FROM madero, recep_madero
UNION ALL
SELECT stella.tenant_id, huesped_stella.usuario_id, 'huesped' FROM stella, huesped_stella
UNION ALL
SELECT madero.tenant_id, huesped_madero.usuario_id, 'huesped' FROM madero, huesped_madero;

-- Mostrar resultados
TABLE tenant;
TABLE hotel;
TABLE usuario;
TABLE tenant_usuario;
TABLE habitacion;
EOF
)

# Ejecutar en el contenedor
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -c "$SQL"