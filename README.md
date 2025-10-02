# DockHotel Manager (HOTELERIA_MULTITENANT)

Aplicación multi-tenant para gestión hotelera que centraliza la administración de hoteles, habitaciones, reservas, pagos y huéspedes. Se trabajó con backend en Node.js/Express, frontend en React, base de datos PostgreSQL con políticas de seguridad por huespedes y utilización de Docker para levantar el entorno completo.

## Características destacadas
- **Arquitectura multi-tenant real**: Postgres implementa aislamiento por huesped mediante Row Level Security (RLS) y políticas específicas para cada tabla core.
- **Roles diferenciados**: flujos y permisos para `admin`, `recepcionista` y `huesped`, con experiencia dedicada en el frontend.
- **Gestión integral**: creación/edición de hoteles, habitaciones, reservas, huéspedes y pagos, además de generación de boletas imprimibles.
- **Cache con Redis**: endpoints críticos (por ejemplo, listado de hoteles) aprovechan Redis para reducir carga sobre la base de datos.
- **Auditoría**: triggers almacenan en `audit_log` los cambios sobre reservas y pagos.
- **Contenedores listos para producción**: `docker-compose` orquesta Postgres, Redis, backend y frontend (sirviendo el build estático con Nginx).

## Estructura del repositorio
- `backend/` – API REST Express, configuración Redis y rutas para hoteles, usuarios, reservas, pagos, habitaciones y huéspedes.
- `frontend/react-app/` – SPA construida con React + Vite; dashboards por rol y consumo de la API.
- `frontend/vue-app/` – prototipo inicial (sin configurar) para una segunda interfaz.
- `db/init.sql` – definición completa del esquema, enums, RLS, triggers y carga inicial mínima.
- `docker/` – Dockerfiles para backend, frontend y Nginx reverso.
- `scripts/` – automatizaciones: levantar/bajar contenedores, poblar datos de ejemplo y exportar metadata de la base.
- `docs/` – espacio para documentación adicional (actualmente vacío).

## Stack tecnológico
- **Backend**: Node.js 18, Express, pg, Redis, bcrypt, uuid.
- **Frontend**: React 19 + Vite, Bootstrap 5 vía CDN, React Router (pendiente de uso), componentes escritos en JSX moderno.
- **Infraestructura**: PostgreSQL 15, Redis 7, Docker Compose, Nginx.

## Puesta en marcha
### Opción 1: Docker Compose (recomendada)
1. Requisitos: Docker >= 24 y Docker Compose >= 2.
2. Ejecuta `./scripts/start.sh` (o `docker-compose up --build -d`).
3. El stack expone:
   - Frontend en http://localhost:3000
   - API en http://localhost:4000
   - Postgres en `localhost:5432` (usuario/password `postgres`)
   - Redis en `localhost:6379`
4. (Opcional) Pobla datos de ejemplo: `./scripts/creacion_tenant.sh`. Crea 2 hoteles, usuarios para cada rol y habitaciones iniciales.
5. Para detener servicios: `./scripts/stop.sh`.

> **Nota**: Los hashes de contraseña en los scripts corresponden a un password común (`123456`). Ajusta estos valores antes de desplegar en entornos reales.

### Opción 2: Ejecución manual
1. **Base de datos**
   - Levanta PostgreSQL y ejecuta `db/init.sql` para crear esquema y políticas.
   - Inicia Redis (puede ser local o en contenedor aparte).
2. **Backend**
   ```bash
   cd backend
   npm install
   # Variables (se pueden exportar o definir en un archivo .env)
   export POSTGRES_USER=postgres
   export POSTGRES_PASSWORD=postgres
   export POSTGRES_DB=hotel_manager
   export POSTGRES_HOST=localhost
   export REDIS_HOST=localhost
   npm run dev
   ```
   El servidor escucha en `http://localhost:4000`.
3. **Frontend**
   ```bash
   cd frontend/react-app
   npm install
   # Apunta la SPA a la API. Ejemplo:
   echo "VITE_API_URL=http://localhost:4000" > .env.local
   npm run dev
   ```
   La aplicación Vite se sirve por defecto en `http://localhost:5173`.

## Funcionalidades principales
### Backend (API REST)
- `POST /api/usuarios/login` – autenticación con email/contraseña, devuelve rol y hotel asignado.
- `POST /api/usuarios/register-huesped` – registro de huéspedes con validaciones de teléfono y documento.
- `GET|POST|PUT|DELETE /api/hoteles` – CRUD de hoteles; integración con Redis para cachear listados y detalles.
- `GET|POST|PUT|DELETE /api/habitaciones` – administración de habitaciones con validación de rol y control de solapamiento de reservas.
- `GET|POST|PUT|DELETE /api/reservas` – gestión de reservas, cálculo automático de noches y totales, actualización de estado de pago.
- `GET /api/pagos`, `GET|POST /api/pagos/:id/detalle`, `GET /api/pagos/:id/boleta` – seguimiento de pagos y generación de boleta imprimible con desglose de IVA.
- `GET|PUT|DELETE /api/huespedes` – panel de huéspedes, historial de reservas y reglas para evitar eliminar clientes con reservas activas.

Las rutas comparten utilidades como:
- Uso de Redis para cache (hoteles) y para invalidar entradas tras cambios.
- Conexiones PSQL mediante `pg.Pool`, transacciones explícitas en operaciones críticas y funciones auxiliares para normalizar datos.
- Middleware centralizado en `server.js` para CORS, análisis de JSON y manejo de señales, asegurando apagado limpio de Redis y evitando pérdida de conexiones.
- Estrategia multi-tenant aplicada desde la capa de datos: cada endpoint establece relaciones con `tenant_id` y delega el aislamiento a RLS; las consultas siempre incluyen filtros por tenant/hotel del usuario autenticado.
- Uso extensivo de funciones auxiliares en las rutas (`fetchHotelById`, `fetchReservaById`, etc.) para reutilizar consultas complejas y garantizar consistencia en la forma de responder.
- Transacciones explícitas (`BEGIN`/`COMMIT`/`ROLLBACK`) en operaciones sensibles como eliminar hoteles o confirmar pagos para preservar integridad referencial y revertir cambios ante cualquier error.
- Validaciones de entrada server-side (tipos, rangos, formatos de documentos chilenos, reglas de negocio como evitar habitaciones duplicadas o reservas en conflicto) antes de interactuar con la base de datos.
- Manejo de errores mediante respuestas JSON coherentes (`{ error: message }`) y logging en consola, lo que facilita depuración en desarrollo y captura en plataformas de observabilidad.
- Integración con `bcrypt` para almacenar hashes de contraseña, normalizando credenciales y protegiendo datos sensibles en scripts de seeding y en el flujo de registro/login.

**Ciclo de vida de una petición típica**
1. El cliente (React) invoca un endpoint del backend, enviando credenciales o identificadores de tenant cuando es necesario.
2. `server.js` aplica middleware de CORS/JSON y delega la petición al router correspondiente.
3. El router valida el payload, obtiene una conexión del pool de PostgreSQL y, cuando aplica, verifica pertenencia del usuario al tenant mediante joins sobre `tenant_usuario`.
4. Se ejecuta la consulta principal; si el resultado es cachéable (por ejemplo, listados de hoteles), el servicio interactúa con Redis (`ensureRedisConnection`, `setEx`, `del`) para construir o invalidar la entrada.
5. En operaciones que modifican estado, se usan transacciones y consultas auxiliares para propagar cambios derivados (actualizar totales de pagos, sincronizar nombres de tenant/hotel, limpiar relaciones).
6. La respuesta JSON se formatea con los campos necesarios para el frontend (por ejemplo, etiquetas de hotel, totales pagados/pendientes). Ante fallas se devuelve código HTTP 4xx/5xx con detalle legible.

**Conexiones y recursos**
- `pg.Pool` mantiene conexiones reutilizables hacia Postgres, controlando concurrencia sin saturar la base.
- `redisClient` se inicializa una vez y se reutiliza a través de `ensureRedisConnection`, evitando conectarse para cada petición y cerrándose ordenadamente al recibir señales SIGINT/SIGTERM.
- El backend depende de variables de entorno (`POSTGRES_*`, `REDIS_*`, `PORT`) inyectadas por Docker Compose o el shell, lo que facilita apuntar a instancias distintas en desarrollo, staging o producción.

**Auditoría y trazabilidad**
- Cada alta/baja/cambio en `reserva` y `pago` dispara triggers que insertan una entrada en `audit_log` con el payload previo/posterior.
- Los endpoints de pago propagan información adicional hacia `detalle_pago`, permitiendo reconstruir boletas y presentar comprobantes con fecha/hora de confirmación.

**Autenticación y control de acceso**
- El login retorna el listado de tenants a los que pertenece el usuario; la API obliga a que operaciones administrativas incluyan `tenantId` y contrasta contra `tenant_usuario` para evitar escaladas de privilegio.
- Roles (`rol_enum`) se respetan en cada router: solo admin puede crear nuevos hoteles o listar huéspedes globalmente; los recepcionistas quedan restringidos al hotel/tenant asignado; los huéspedes únicamente operan sobre sus reservas.

### Frontend (React)
- **Inicio de sesión y registro** integrados al flujo multi-tenant.
- **Dashboard de Admin**: creación/edición/eliminación de hoteles, visualización de métricas financieras, monitoreo de reservas globales y gestión de huéspedes.
- **Dashboard de Recepcionista**: inventario de habitaciones del hotel asignado, flujos para crear/editar habitaciones, confirmar pagos, revisar reservas y acceder a detalle de boletas.
- **Dashboard de Huésped**: buscador de habitaciones disponibles con filtros por fecha, cálculo dinámico de tarifa y simulación de pasarelas de pago (tarjeta, transferencia, efectivo).
- **Gestión de pagos** centralizada con filtros, modal detallado y opción de impresión.

La capa de datos se maneja desde `src/api.js`, que centraliza llamadas fetch y manejo de errores.

## Diseño de base de datos
- Tablas clave: `tenant`, `usuario`, `tenant_usuario`, `hotel`, `habitacion`, `huesped`, `reserva`, `pago`, `detalle_pago`, `venta`, `tour`, `asiento`, entre otras entidades de apoyo.
- Enums tipados para roles, estado de habitaciones, estado de reserva, métodos de pago y estado de pago.
- Políticas RLS que restringen lecturas/escrituras al tenant asignado (`current_setting('app.current_tenant')`).
- Triggers de auditoría (`reserva_audit`, `pago_audit`) que registran cambios en `audit_log` con payload JSONB.
- Vistas auxiliares y funciones PL/pgSQL para soportar auditorías y mantener consistencia.

## Scripts y utilidades
- `scripts/start.sh` / `scripts/stop.sh` – wrappers de `docker-compose`.
- `scripts/creacion_tenant.sh` / `scripts/creacion_SQL.bat` – poblado de tenants, hoteles, usuarios de prueba y habitaciones iniciales.
- `scripts/resultados_consultas_postgreSQL.sh` – exporta a CSV la metadata del esquema (columnas, llaves, índices, políticas, enums, funciones).

## Próximos pasos a implementar
- Añadir pruebas automatizadas para rutas críticas y componentes React.
- Externalizar a variables de entorno los secretos y credenciales usadas en scripts de semilla.
- Gestión de Recepcionistas (operaciones CRUD).
- Gestión de sucursales por hotel (operaciones CRUD).
- Nuevo rol de gerente para administrar cada hotel por separado.
- Que los datos no se eliminen de todo, estado activo o inactivo o crear tablas de historicos.
- Crear registro de reportes para gerente y admin
- Actualizar codigo backend para utilizar ORM y no queries SQL directamente.
- Integrar chart js para generar graficos.

---
## Integrantes
**Autores**: equipo de Especialidad III – Proyecto Hotelería Multitenant.
- Javier Alonso Martínez Sepúlveda 
- Benjamin Soto
- Melanie Seguel
