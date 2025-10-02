#!/bin/bash

# Variables
CONTAINER_NAME="hotel_db"
DB_USER="postgres"
DB_NAME="hotel_manager"

# SQL a ejecutar
SQL=$(cat <<'EOF'
BEGIN;

WITH
stella AS (
  INSERT INTO tenant (nombre) VALUES ('Hotel Stella')
  RETURNING tenant_id
),
madero AS (
  INSERT INTO tenant (nombre) VALUES ('Hotel Madero')
  RETURNING tenant_id
),
hotel_stella AS (
  INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email)
  SELECT tenant_id, 'Hotel Stella', 'Av. Principal 123', '+56911111111', 'contacto@stella.com'
  FROM stella
  RETURNING hotel_id, tenant_id
),
hotel_madero AS (
  INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email)
  SELECT tenant_id, 'Hotel Madero', 'Calle Secundaria 456', '+56922222222', 'contacto@madero.com'
  FROM madero
  RETURNING hotel_id, tenant_id
),
sucursal_stella_centro AS (
  INSERT INTO sucursal (tenant_id, hotel_id, nombre, direccion, telefono, email)
  SELECT hs.tenant_id, hs.hotel_id, 'Centro', 'Av. Centro 101', '+56911111112', 'centro@stella.com'
  FROM hotel_stella hs
  RETURNING sucursal_id, hotel_id, tenant_id
),
sucursal_stella_aeropuerto AS (
  INSERT INTO sucursal (tenant_id, hotel_id, nombre, direccion, telefono, email)
  SELECT hs.tenant_id, hs.hotel_id, 'Aeropuerto', 'Camino Aeropuerto 505', '+56911111113', 'aeropuerto@stella.com'
  FROM hotel_stella hs
  RETURNING sucursal_id, hotel_id, tenant_id
),
sucursal_madero_centro AS (
  INSERT INTO sucursal (tenant_id, hotel_id, nombre, direccion, telefono, email)
  SELECT hm.tenant_id, hm.hotel_id, 'Centro', 'Calle Central 789', '+56922222233', 'centro@madero.com'
  FROM hotel_madero hm
  RETURNING sucursal_id, hotel_id, tenant_id
),
sucursal_madero_bosque AS (
  INSERT INTO sucursal (tenant_id, hotel_id, nombre, direccion, telefono, email)
  SELECT hm.tenant_id, hm.hotel_id, 'Bosque', 'Ruta Bosque 321', '+56922222244', 'bosque@madero.com'
  FROM hotel_madero hm
  RETURNING sucursal_id, hotel_id, tenant_id
),
admin_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('admin@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Administrador de Hoteles')
  RETURNING usuario_id
),
admin_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('admin2@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Administrador de Hoteles')
  RETURNING usuario_id
),
gerente_stella AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('gerente_stella@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Valentina Rojas')
  RETURNING usuario_id
),
gerente_madero AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('gerente_madero@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Matías Fuentes')
  RETURNING usuario_id
),
recep_stella_centro AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('recep_centro@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Alejandro González')
  RETURNING usuario_id
),
recep_stella_aeropuerto AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('recep_aeropuerto@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Daniela Pérez')
  RETURNING usuario_id
),
recep_madero_centro AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('recep_centro@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Benjamín Soto')
  RETURNING usuario_id
),
recep_madero_bosque AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('recep_bosque@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Laura Aguilera')
  RETURNING usuario_id
),
huesped_stella_centro_1 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped1@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'David Goggins')
  RETURNING usuario_id
),
huesped_stella_centro_2 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped2@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'María López')
  RETURNING usuario_id
),
huesped_stella_aeropuerto_1 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped3@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Carlos Pérez')
  RETURNING usuario_id
),
huesped_stella_aeropuerto_2 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped4@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Andrea Castillo')
  RETURNING usuario_id
),
huesped_madero_centro_1 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped1@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Lucario Martínez')
  RETURNING usuario_id
),
huesped_madero_centro_2 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped2@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Valeria Gómez')
  RETURNING usuario_id
),
huesped_madero_bosque_1 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped3@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Diego Hernández')
  RETURNING usuario_id
),
huesped_madero_bosque_2 AS (
  INSERT INTO usuario (email, password_hash, nombre)
  VALUES ('huesped4@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Fernanda Silva')
  RETURNING usuario_id
),
habitaciones_stella_centro AS (
  INSERT INTO habitacion (tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado)
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
  FROM sucursal_stella_centro s
  CROSS JOIN (VALUES
    (101, 'simple', 35000, 'disponible'),
    (102, 'doble', 48000, 'disponible')
  ) AS v(numero, tipo, precio, estado)
  RETURNING habitacion_id
),
habitaciones_stella_aeropuerto AS (
  INSERT INTO habitacion (tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado)
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
  FROM sucursal_stella_aeropuerto s
  CROSS JOIN (VALUES
    (201, 'simple', 36000, 'disponible'),
    (202, 'suite', 82000, 'disponible')
  ) AS v(numero, tipo, precio, estado)
  RETURNING habitacion_id
),
habitaciones_madero_centro AS (
  INSERT INTO habitacion (tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado)
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
  FROM sucursal_madero_centro s
  CROSS JOIN (VALUES
    (101, 'simple', 30000, 'disponible'),
    (102, 'doble', 45000, 'disponible')
  ) AS v(numero, tipo, precio, estado)
  RETURNING habitacion_id
),
habitaciones_madero_bosque AS (
  INSERT INTO habitacion (tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado)
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
  FROM sucursal_madero_bosque s
  CROSS JOIN (VALUES
    (201, 'simple', 29500, 'disponible'),
    (202, 'suite', 78000, 'disponible')
  ) AS v(numero, tipo, precio, estado)
  RETURNING habitacion_id
),
recepcionistas_map AS (
  INSERT INTO recepcionista_sucursal (tenant_id, hotel_id, sucursal_id, usuario_id, telefono, activo)
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970010001', TRUE
  FROM sucursal_stella_centro s, recep_stella_centro r
  UNION ALL
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970010002', TRUE
  FROM sucursal_stella_aeropuerto s, recep_stella_aeropuerto r
  UNION ALL
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970020001', TRUE
  FROM sucursal_madero_centro s, recep_madero_centro r
  UNION ALL
  SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970020002', TRUE
  FROM sucursal_madero_bosque s, recep_madero_bosque r
  RETURNING recepcionista_sucursal_id
),
huesped_fichas AS (
  INSERT INTO huesped (huesped_id, tenant_id, sucursal_id, nombre_completo, email, telefono, documento, created_at)
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'David Goggins', 'huesped1@stella.com', '+56930010001', '20759513-6', now()
  FROM huesped_stella_centro_1 u, sucursal_stella_centro s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'María López', 'huesped2@stella.com', '+56930010002', '18222333-5', now()
  FROM huesped_stella_centro_2 u, sucursal_stella_centro s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Carlos Pérez', 'huesped3@stella.com', '+56930010003', '20333444-7', now()
  FROM huesped_stella_aeropuerto_1 u, sucursal_stella_aeropuerto s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Andrea Castillo', 'huesped4@stella.com', '+56930010004', '21333555-9', now()
  FROM huesped_stella_aeropuerto_2 u, sucursal_stella_aeropuerto s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Lucario Martínez', 'huesped1@madero.com', '+56930020001', '15333111-2', now()
  FROM huesped_madero_centro_1 u, sucursal_madero_centro s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Valeria Gómez', 'huesped2@madero.com', '+56930020002', '17666444-3', now()
  FROM huesped_madero_centro_2 u, sucursal_madero_centro s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Diego Hernández', 'huesped3@madero.com', '+56930020003', '18888777-5', now()
  FROM huesped_madero_bosque_1 u, sucursal_madero_bosque s
  UNION ALL
  SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Fernanda Silva', 'huesped4@madero.com', '+56930020004', '19999888-1', now()
  FROM huesped_madero_bosque_2 u, sucursal_madero_bosque s
  RETURNING huesped_id
),
tenant_roles AS (
  INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
  SELECT st.tenant_id, admin_stella.usuario_id, 'admin'::rol_enum FROM stella st, admin_stella
  UNION ALL
  SELECT md.tenant_id, admin_madero.usuario_id, 'admin'::rol_enum FROM madero md, admin_madero
  UNION ALL
  SELECT st.tenant_id, gerente_stella.usuario_id, 'gerente'::rol_enum FROM stella st, gerente_stella
  UNION ALL
  SELECT md.tenant_id, gerente_madero.usuario_id, 'gerente'::rol_enum FROM madero md, gerente_madero
  UNION ALL
  SELECT s.tenant_id, recep_stella_centro.usuario_id, 'recepcionista'::rol_enum FROM sucursal_stella_centro s, recep_stella_centro
  UNION ALL
  SELECT s.tenant_id, recep_stella_aeropuerto.usuario_id, 'recepcionista'::rol_enum FROM sucursal_stella_aeropuerto s, recep_stella_aeropuerto
  UNION ALL
  SELECT s.tenant_id, recep_madero_centro.usuario_id, 'recepcionista'::rol_enum FROM sucursal_madero_centro s, recep_madero_centro
  UNION ALL
  SELECT s.tenant_id, recep_madero_bosque.usuario_id, 'recepcionista'::rol_enum FROM sucursal_madero_bosque s, recep_madero_bosque
  UNION ALL
  SELECT s.tenant_id, huesped_stella_centro_1.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_centro s, huesped_stella_centro_1
  UNION ALL
  SELECT s.tenant_id, huesped_stella_centro_2.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_centro s, huesped_stella_centro_2
  UNION ALL
  SELECT s.tenant_id, huesped_stella_aeropuerto_1.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_aeropuerto s, huesped_stella_aeropuerto_1
  UNION ALL
  SELECT s.tenant_id, huesped_stella_aeropuerto_2.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_aeropuerto s, huesped_stella_aeropuerto_2
  UNION ALL
  SELECT s.tenant_id, huesped_madero_centro_1.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_centro s, huesped_madero_centro_1
  UNION ALL
  SELECT s.tenant_id, huesped_madero_centro_2.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_centro s, huesped_madero_centro_2
  UNION ALL
  SELECT s.tenant_id, huesped_madero_bosque_1.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_bosque s, huesped_madero_bosque_1
  UNION ALL
  SELECT s.tenant_id, huesped_madero_bosque_2.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_bosque s, huesped_madero_bosque_2
  RETURNING *
)
SELECT COUNT(*) AS total_roles_insertados FROM tenant_roles;

COMMIT;

TABLE tenant;
TABLE hotel;
TABLE sucursal;
TABLE usuario;
TABLE tenant_usuario;
TABLE recepcionista_sucursal;
TABLE habitacion;
TABLE huesped;
EOF
)

# Ejecutar en el contenedor
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -c "$SQL"
