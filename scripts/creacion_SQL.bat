@echo off
setlocal

REM Variables
set CONTAINER_NAME=hotel_db
set DB_USER=postgres
set DB_NAME=hotel_manager
set SQL_FILE=creacion_tenant.sql

REM Crear archivo SQL temporal
echo -- Crear tenants> %SQL_FILE%
echo WITH stella AS (>> %SQL_FILE%
echo   INSERT INTO tenant (nombre) VALUES ('Hotel Stella') RETURNING tenant_id>> %SQL_FILE%
echo ),>> %SQL_FILE%
echo madero AS (>> %SQL_FILE%
echo   INSERT INTO tenant (nombre) VALUES ('Hotel Madero') RETURNING tenant_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo -- Crear hoteles asociados a cada tenant>> %SQL_FILE%
echo hotel_stella AS (>> %SQL_FILE%
echo   INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email)>> %SQL_FILE%
echo   SELECT stella.tenant_id, 'Hotel Stella', 'Av. Principal 123', '+56911111111', 'contacto@stella.com' FROM stella>> %SQL_FILE%
echo   RETURNING hotel_id, tenant_id>> %SQL_FILE%
echo ),>> %SQL_FILE%
echo hotel_madero AS (>> %SQL_FILE%
echo   INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email)>> %SQL_FILE%
echo   SELECT madero.tenant_id, 'Hotel Madero', 'Calle Secundaria 456', '+56922222222', 'contacto@madero.com' FROM madero>> %SQL_FILE%
echo   RETURNING hotel_id, tenant_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo -- Crear usuarios>> %SQL_FILE%
echo admin_stella AS (>> %SQL_FILE%
echo   INSERT INTO usuario (email, password_hash, nombre) VALUES (>> %SQL_FILE%
echo     'admin@hotel.com',>> %SQL_FILE%
echo     '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',>> %SQL_FILE%
echo     'Administrador de Hoteles')>> %SQL_FILE%
echo   RETURNING usuario_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo admin_madero AS (>> %SQL_FILE%
echo   INSERT INTO usuario (email, password_hash, nombre) VALUES (>> %SQL_FILE%
echo     'admin2@hotel.com',>> %SQL_FILE%
echo     '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',>> %SQL_FILE%
echo     'Administrador de Hoteles')>> %SQL_FILE%
echo   RETURNING usuario_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo recep_stella AS (>> %SQL_FILE%
echo   INSERT INTO usuario (email, password_hash, nombre) VALUES (>> %SQL_FILE%
echo     'recep_stella@hotel.com',>> %SQL_FILE%
echo     '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',>> %SQL_FILE%
echo     'Alejandro Gonzalez')>> %SQL_FILE%
echo   RETURNING usuario_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo recep_madero AS (>> %SQL_FILE%
echo   INSERT INTO usuario (email, password_hash, nombre) VALUES (>> %SQL_FILE%
echo     'recep_madero@hotel.com',>> %SQL_FILE%
echo     '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',>> %SQL_FILE%
echo     'Benjamin Soto')>> %SQL_FILE%
echo   RETURNING usuario_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo huesped_stella AS (>> %SQL_FILE%
echo   INSERT INTO usuario (email, password_hash, nombre) VALUES (>> %SQL_FILE%
echo     'huesped_stella@hotel.com',>> %SQL_FILE%
echo     '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',>> %SQL_FILE%
echo     'David Goggins')>> %SQL_FILE%
echo   RETURNING usuario_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo huesped_madero AS (>> %SQL_FILE%
echo   INSERT INTO usuario (email, password_hash, nombre) VALUES (>> %SQL_FILE%
echo     'huesped_madero@hotel.com',>> %SQL_FILE%
echo     '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2',>> %SQL_FILE%
echo     'Lucario Martinez')>> %SQL_FILE%
echo   RETURNING usuario_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo -- Crear habitaciones para Hotel Stella>> %SQL_FILE%
echo habitaciones_stella AS (>> %SQL_FILE%
echo   INSERT INTO habitacion (tenant_id, hotel_id, numero, tipo, precio_noche, estado)>> %SQL_FILE%
echo   SELECT tenant_id, hotel_id, 101, 'simple'::tipo_habitacion_enum, 30000, 'disponible'::estado_habitacion_enum FROM hotel_stella>> %SQL_FILE%
echo   UNION ALL>> %SQL_FILE%
echo   SELECT tenant_id, hotel_id, 102, 'doble'::tipo_habitacion_enum, 45000, 'ocupada'::estado_habitacion_enum FROM hotel_stella>> %SQL_FILE%
echo   UNION ALL>> %SQL_FILE%
echo   SELECT tenant_id, hotel_id, 201, 'suite'::tipo_habitacion_enum, 80000, 'limpieza'::estado_habitacion_enum FROM hotel_stella>> %SQL_FILE%
echo   RETURNING habitacion_id>> %SQL_FILE%
echo ),>> %SQL_FILE%

echo -- Crear habitaciones para Hotel Madero>> %SQL_FILE%
echo habitaciones_madero AS (>> %SQL_FILE%
echo   INSERT INTO habitacion (tenant_id, hotel_id, numero, tipo, precio_noche, estado)>> %SQL_FILE%
echo   SELECT tenant_id, hotel_id, 101, 'simple'::tipo_habitacion_enum, 28000, 'disponible'::estado_habitacion_enum FROM hotel_madero>> %SQL_FILE%
echo   UNION ALL>> %SQL_FILE%
echo   SELECT tenant_id, hotel_id, 102, 'doble'::tipo_habitacion_enum, 42000, 'ocupada'::estado_habitacion_enum FROM hotel_madero>> %SQL_FILE%
echo   UNION ALL>> %SQL_FILE%
echo   SELECT tenant_id, hotel_id, 201, 'suite'::tipo_habitacion_enum, 75000, 'limpieza'::estado_habitacion_enum FROM hotel_madero>> %SQL_FILE%
echo   RETURNING habitacion_id>> %SQL_FILE%
echo )>> %SQL_FILE%

echo -- Asignar usuarios a tenants>> %SQL_FILE%
echo INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)>> %SQL_FILE%
echo SELECT stella.tenant_id, admin_stella.usuario_id, 'admin'::rol_enum FROM stella, admin_stella>> %SQL_FILE%
echo UNION ALL>> %SQL_FILE%
echo SELECT madero.tenant_id, admin_madero.usuario_id, 'admin'::rol_enum FROM madero, admin_madero>> %SQL_FILE%
echo UNION ALL>> %SQL_FILE%
echo SELECT stella.tenant_id, recep_stella.usuario_id, 'recepcionista'::rol_enum FROM stella, recep_stella>> %SQL_FILE%
echo UNION ALL>> %SQL_FILE%
echo SELECT madero.tenant_id, recep_madero.usuario_id, 'recepcionista'::rol_enum FROM madero, recep_madero>> %SQL_FILE%
echo UNION ALL>> %SQL_FILE%
echo SELECT stella.tenant_id, huesped_stella.usuario_id, 'huesped'::rol_enum FROM stella, huesped_stella>> %SQL_FILE%
echo UNION ALL>> %SQL_FILE%
echo SELECT madero.tenant_id, huesped_madero.usuario_id, 'huesped'::rol_enum FROM madero, huesped_madero;>> %SQL_FILE%

echo -- Mostrar resultados>> %SQL_FILE%
echo TABLE tenant;>> %SQL_FILE%
echo TABLE hotel;>> %SQL_FILE%
echo TABLE usuario;>> %SQL_FILE%
echo TABLE tenant_usuario;>> %SQL_FILE%
echo TABLE habitacion;>> %SQL_FILE%

REM Ejecutar en el contenedor
echo Ejecutando SQL en %CONTAINER_NAME%...
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% -v ON_ERROR_STOP=1 < %SQL_FILE%

pause