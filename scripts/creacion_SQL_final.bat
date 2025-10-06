@echo off
setlocal EnableDelayedExpansion

REM Variables
set "CONTAINER_NAME=hotel_db"
set "DB_USER=postgres"
set "DB_NAME=hotel_manager"
set "SQL_FILE=creacion_tenant_final.sql"

echo ========================================
echo    SCRIPT DE CREACION DE TENANTS
echo    Sistema de Gestion Hotelera
echo    (Version Final Funcional)
echo ========================================
echo.

REM Crear el archivo SQL con limpieza previa
echo Generando archivo SQL...
(
echo -- Limpieza de datos existentes ^(en orden correcto para evitar violaciones FK^)
echo DELETE FROM tenant_usuario;
echo DELETE FROM recepcionista_sucursal;
echo DELETE FROM huesped;
echo DELETE FROM habitacion;
echo DELETE FROM sucursal;
echo DELETE FROM hotel;
echo DELETE FROM usuario;
echo DELETE FROM tenant;
echo.
echo BEGIN;
echo.
echo WITH
echo stella AS ^(
echo   INSERT INTO tenant ^(nombre^) VALUES ^('Hotel Stella'^)
echo   RETURNING tenant_id
echo ^),
echo madero AS ^(
echo   INSERT INTO tenant ^(nombre^) VALUES ^('Hotel Madero'^)
echo   RETURNING tenant_id
echo ^),
echo hotel_stella AS ^(
echo   INSERT INTO hotel ^(tenant_id, nombre, direccion, telefono, email^)
echo   SELECT tenant_id, 'Hotel Stella', 'Av. Principal 123', '+56911111111', 'contacto@stella.com'
echo   FROM stella
echo   RETURNING hotel_id, tenant_id
echo ^),
echo hotel_madero AS ^(
echo   INSERT INTO hotel ^(tenant_id, nombre, direccion, telefono, email^)
echo   SELECT tenant_id, 'Hotel Madero', 'Calle Secundaria 456', '+56922222222', 'contacto@madero.com'
echo   FROM madero
echo   RETURNING hotel_id, tenant_id
echo ^),
echo sucursal_stella_centro AS ^(
echo   INSERT INTO sucursal ^(tenant_id, hotel_id, nombre, direccion, telefono, email^)
echo   SELECT hs.tenant_id, hs.hotel_id, 'Centro', 'Av. Centro 101', '+56911111112', 'centro@stella.com'
echo   FROM hotel_stella hs
echo   RETURNING sucursal_id, hotel_id, tenant_id
echo ^),
echo sucursal_stella_aeropuerto AS ^(
echo   INSERT INTO sucursal ^(tenant_id, hotel_id, nombre, direccion, telefono, email^)
echo   SELECT hs.tenant_id, hs.hotel_id, 'Aeropuerto', 'Camino Aeropuerto 505', '+56911111113', 'aeropuerto@stella.com'
echo   FROM hotel_stella hs
echo   RETURNING sucursal_id, hotel_id, tenant_id
echo ^),
echo sucursal_madero_centro AS ^(
echo   INSERT INTO sucursal ^(tenant_id, hotel_id, nombre, direccion, telefono, email^)
echo   SELECT hm.tenant_id, hm.hotel_id, 'Centro', 'Calle Central 789', '+56922222233', 'centro@madero.com'
echo   FROM hotel_madero hm
echo   RETURNING sucursal_id, hotel_id, tenant_id
echo ^),
echo sucursal_madero_bosque AS ^(
echo   INSERT INTO sucursal ^(tenant_id, hotel_id, nombre, direccion, telefono, email^)
echo   SELECT hm.tenant_id, hm.hotel_id, 'Bosque', 'Ruta Bosque 321', '+56922222244', 'bosque@madero.com'
echo   FROM hotel_madero hm
echo   RETURNING sucursal_id, hotel_id, tenant_id
echo ^),
echo admin_stella AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('admin@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Administrador Hotel Stella', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo admin_madero AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('admin2@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Administrador Hotel Madero', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo gerente_stella AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('gerente_stella@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Valentina Rojas', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo gerente_madero AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('gerente_madero@hotel.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Matias Fuentes', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo recep_stella_centro AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('recep_centro@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Alejandro Gonzalez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo recep_stella_aeropuerto AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('recep_aeropuerto@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Daniela Perez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo recep_madero_centro AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('recep_centro@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Benjamin Soto', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo recep_madero_bosque AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('recep_bosque@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Laura Aguilera', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_stella_centro_1 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped1@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'David Goggins', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_stella_centro_2 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped2@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Maria Lopez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_stella_aeropuerto_1 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped3@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Carlos Perez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_stella_aeropuerto_2 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped4@stella.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Andrea Castillo', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_madero_centro_1 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped1@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Lucario Martinez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_madero_centro_2 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped2@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Valeria Gomez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_madero_bosque_1 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped3@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Diego Hernandez', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo huesped_madero_bosque_2 AS ^(
echo   INSERT INTO usuario ^(email, password_hash, nombre, email_verificado, email_verificado_en^)
echo   VALUES ^('huesped4@madero.com', '$2b$10$Y2.3XqaGb3bO2CG.EZPR9.8maAVCDSMcze5wyFtSQNHs.Qzx.3sA2', 'Fernanda Silva', TRUE, NOW^(^)^)
echo   RETURNING usuario_id
echo ^),
echo habitaciones_stella_centro AS ^(
echo   INSERT INTO habitacion ^(tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado^)
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
echo   FROM sucursal_stella_centro s
echo   CROSS JOIN ^(VALUES
echo     ^(101, 'simple', 35000, 'disponible'^),
echo     ^(102, 'doble', 48000, 'disponible'^)
echo   ^) AS v^(numero, tipo, precio, estado^)
echo   RETURNING habitacion_id
echo ^),
echo habitaciones_stella_aeropuerto AS ^(
echo   INSERT INTO habitacion ^(tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado^)
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
echo   FROM sucursal_stella_aeropuerto s
echo   CROSS JOIN ^(VALUES
echo     ^(201, 'simple', 36000, 'disponible'^),
echo     ^(202, 'suite', 82000, 'disponible'^)
echo   ^) AS v^(numero, tipo, precio, estado^)
echo   RETURNING habitacion_id
echo ^),
echo habitaciones_madero_centro AS ^(
echo   INSERT INTO habitacion ^(tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado^)
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
echo   FROM sucursal_madero_centro s
echo   CROSS JOIN ^(VALUES
echo     ^(101, 'simple', 30000, 'disponible'^),
echo     ^(102, 'doble', 45000, 'disponible'^)
echo   ^) AS v^(numero, tipo, precio, estado^)
echo   RETURNING habitacion_id
echo ^),
echo habitaciones_madero_bosque AS ^(
echo   INSERT INTO habitacion ^(tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado^)
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, v.numero, v.tipo::tipo_habitacion_enum, v.precio, v.estado::estado_habitacion_enum
echo   FROM sucursal_madero_bosque s
echo   CROSS JOIN ^(VALUES
echo     ^(201, 'simple', 29500, 'disponible'^),
echo     ^(202, 'suite', 78000, 'disponible'^)
echo   ^) AS v^(numero, tipo, precio, estado^)
echo   RETURNING habitacion_id
echo ^),
echo recepcionistas_map AS ^(
echo   INSERT INTO recepcionista_sucursal ^(tenant_id, hotel_id, sucursal_id, usuario_id, telefono, activo^)
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970010001', TRUE
echo   FROM sucursal_stella_centro s, recep_stella_centro r
echo   UNION ALL
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970010002', TRUE
echo   FROM sucursal_stella_aeropuerto s, recep_stella_aeropuerto r
echo   UNION ALL
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970020001', TRUE
echo   FROM sucursal_madero_centro s, recep_madero_centro r
echo   UNION ALL
echo   SELECT s.tenant_id, s.hotel_id, s.sucursal_id, r.usuario_id, '+56970020002', TRUE
echo   FROM sucursal_madero_bosque s, recep_madero_bosque r
echo   RETURNING recepcionista_sucursal_id
echo ^),
echo huesped_fichas AS ^(
echo   INSERT INTO huesped ^(huesped_id, tenant_id, sucursal_id, nombre_completo, email, telefono, documento, created_at^)
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'David Goggins', 'huesped1@stella.com', '+56930010001', '20759513-6', now^(^)
echo   FROM huesped_stella_centro_1 u, sucursal_stella_centro s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Maria Lopez', 'huesped2@stella.com', '+56930010002', '18222333-5', now^(^)
echo   FROM huesped_stella_centro_2 u, sucursal_stella_centro s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Carlos Perez', 'huesped3@stella.com', '+56930010003', '20333444-7', now^(^)
echo   FROM huesped_stella_aeropuerto_1 u, sucursal_stella_aeropuerto s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Andrea Castillo', 'huesped4@stella.com', '+56930010004', '21333555-9', now^(^)
echo   FROM huesped_stella_aeropuerto_2 u, sucursal_stella_aeropuerto s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Lucario Martinez', 'huesped1@madero.com', '+56930020001', '15333111-2', now^(^)
echo   FROM huesped_madero_centro_1 u, sucursal_madero_centro s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Valeria Gomez', 'huesped2@madero.com', '+56930020002', '17666444-3', now^(^)
echo   FROM huesped_madero_centro_2 u, sucursal_madero_centro s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Diego Hernandez', 'huesped3@madero.com', '+56930020003', '18888777-5', now^(^)
echo   FROM huesped_madero_bosque_1 u, sucursal_madero_bosque s
echo   UNION ALL
echo   SELECT u.usuario_id, s.tenant_id, s.sucursal_id, 'Fernanda Silva', 'huesped4@madero.com', '+56930020004', '19999888-1', now^(^)
echo   FROM huesped_madero_bosque_2 u, sucursal_madero_bosque s
echo   RETURNING huesped_id
echo ^),
echo tenant_roles AS ^(
echo   INSERT INTO tenant_usuario ^(tenant_id, usuario_id, rol^)
echo   SELECT st.tenant_id, admin_stella.usuario_id, 'admin'::rol_enum FROM stella st, admin_stella
echo   UNION ALL
echo   SELECT md.tenant_id, admin_madero.usuario_id, 'admin'::rol_enum FROM madero md, admin_madero
echo   UNION ALL
echo   SELECT st.tenant_id, gerente_stella.usuario_id, 'gerente'::rol_enum FROM stella st, gerente_stella
echo   UNION ALL
echo   SELECT md.tenant_id, gerente_madero.usuario_id, 'gerente'::rol_enum FROM madero md, gerente_madero
echo   UNION ALL
echo   SELECT s.tenant_id, recep_stella_centro.usuario_id, 'recepcionista'::rol_enum FROM sucursal_stella_centro s, recep_stella_centro
echo   UNION ALL
echo   SELECT s.tenant_id, recep_stella_aeropuerto.usuario_id, 'recepcionista'::rol_enum FROM sucursal_stella_aeropuerto s, recep_stella_aeropuerto
echo   UNION ALL
echo   SELECT s.tenant_id, recep_madero_centro.usuario_id, 'recepcionista'::rol_enum FROM sucursal_madero_centro s, recep_madero_centro
echo   UNION ALL
echo   SELECT s.tenant_id, recep_madero_bosque.usuario_id, 'recepcionista'::rol_enum FROM sucursal_madero_bosque s, recep_madero_bosque
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_stella_centro_1.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_centro s, huesped_stella_centro_1
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_stella_centro_2.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_centro s, huesped_stella_centro_2
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_stella_aeropuerto_1.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_aeropuerto s, huesped_stella_aeropuerto_1
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_stella_aeropuerto_2.usuario_id, 'huesped'::rol_enum FROM sucursal_stella_aeropuerto s, huesped_stella_aeropuerto_2
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_madero_centro_1.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_centro s, huesped_madero_centro_1
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_madero_centro_2.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_centro s, huesped_madero_centro_2
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_madero_bosque_1.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_bosque s, huesped_madero_bosque_1
echo   UNION ALL
echo   SELECT s.tenant_id, huesped_madero_bosque_2.usuario_id, 'huesped'::rol_enum FROM sucursal_madero_bosque s, huesped_madero_bosque_2
echo   RETURNING *
echo ^)
echo SELECT COUNT^(^*^) AS total_roles_insertados FROM tenant_roles;
echo.
echo COMMIT;
echo.
echo -- Resumen final de datos creados
echo \echo '=== RESUMEN DE DATOS CREADOS ===' 
echo SELECT 'TENANTS:' as tipo, COUNT^(^*^) as cantidad FROM tenant
echo UNION ALL SELECT 'HOTELES:', COUNT^(^*^) FROM hotel
echo UNION ALL SELECT 'SUCURSALES:', COUNT^(^*^) FROM sucursal  
echo UNION ALL SELECT 'USUARIOS:', COUNT^(^*^) FROM usuario
echo UNION ALL SELECT 'HABITACIONES:', COUNT^(^*^) FROM habitacion
echo UNION ALL SELECT 'HUESPEDES:', COUNT^(^*^) FROM huesped
echo UNION ALL SELECT 'RECEPCIONISTAS:', COUNT^(^*^) FROM recepcionista_sucursal
echo UNION ALL SELECT 'ROLES ASIGNADOS:', COUNT^(^*^) FROM tenant_usuario;
echo.
echo \echo '=== CREDENCIALES DE ACCESO ==='
echo \echo 'Administradores:'
echo SELECT 'Email: ' ^|^| email ^|^| ' - Password: admin123' as credenciales
echo FROM usuario 
echo WHERE email LIKE '%%admin%%'
echo ORDER BY email;
echo.
echo \echo 'Gerentes:'
echo SELECT 'Email: ' ^|^| email ^|^| ' - Password: admin123' as credenciales
echo FROM usuario 
echo WHERE email LIKE '%%gerente%%'
echo ORDER BY email;
) > "%SQL_FILE%"

echo ✓ Archivo SQL generado: %SQL_FILE%
echo.

REM Verificar si el contenedor existe y esta corriendo
echo Verificando contenedor Docker...
docker ps -q -f name=%CONTAINER_NAME% >nul 2>&1
if errorlevel 1 (
    echo ✗ ERROR: El contenedor '%CONTAINER_NAME%' no esta corriendo
    echo   Asegurate de que Docker este iniciado y el contenedor este activo
    goto :error
)

echo ✓ Contenedor '%CONTAINER_NAME%' encontrado y activo
echo.

REM Copiar archivo SQL al contenedor
echo Copiando archivo SQL al contenedor...
docker cp "%SQL_FILE%" %CONTAINER_NAME%:/tmp/%SQL_FILE%
if errorlevel 1 (
    echo ✗ ERROR: No se pudo copiar el archivo SQL al contenedor
    goto :error
)

echo ✓ Archivo copiado al contenedor
echo.

REM Ejecutar el SQL dentro del contenedor
echo Ejecutando SQL en la base de datos...
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% -v ON_ERROR_STOP=1 -f /tmp/%SQL_FILE%
if errorlevel 1 (
    echo ✗ ERROR: Fallo la ejecucion del SQL
    goto :error
)

echo.
echo ========================================
echo ✓ PROCESO COMPLETADO EXITOSAMENTE
echo ========================================
echo   Database inicializada correctamente:
echo   - 2 Tenants ^(Hotel Stella, Hotel Madero^)
echo   - 4 Sucursales ^(2 por hotel^)
echo   - 8 Habitaciones ^(2 por sucursal^)
echo   - 16 Usuarios con roles asignados
echo   - 8 Huespedes registrados
echo   - 4 Recepcionistas asignados
echo.
echo   Password para todos los usuarios: admin123
echo ========================================

REM Limpiar archivo temporal del contenedor
docker exec %CONTAINER_NAME% rm -f /tmp/%SQL_FILE% >nul 2>&1

goto :end

:error
echo.
echo ========================================
echo ✗ PROCESO INTERRUMPIDO CON ERRORES
echo ========================================
echo   Revisa los mensajes de error anteriores
echo   y verifica la configuracion de Docker
echo ========================================

:end
echo.
echo Presiona cualquier tecla para continuar...
pause > nul