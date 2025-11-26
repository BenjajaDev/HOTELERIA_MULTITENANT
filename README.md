# DockHotel Manager (HOTELERIA_MULTITENANT)

Aplicación multi-tenant para gestión hotelera que centraliza la administración de hoteles, habitaciones, reservas, pagos y huéspedes. Se trabajó con backend en Node.js/Express, frontend en React, base de datos PostgreSQL con políticas de seguridad por huespedes y utilización de Docker para levantar el entorno completo.

## Características destacadas
- **Arquitectura multi-tenant real**: Postgres implementa aislamiento por huesped mediante Row Level Security (RLS) y políticas específicas para cada tabla core.
- **Roles diferenciados**: flujos y permisos para `admin`, `recepcionista` y `huesped`, con experiencia dedicada en el frontend.
- **Gestión integral**: creación/edición de hoteles, habitaciones, reservas, huéspedes y pagos, además de generación de boletas imprimibles.
- **Cache con Redis**: endpoints críticos (por ejemplo, listado de hoteles) aprovechan Redis para reducir carga sobre la base de datos.
- **Auditoría**: triggers almacenan en `audit_log` los cambios sobre reservas y pagos.
- **Alta segura de huéspedes**: creación de cuentas con contraseña y envío automático de correos de verificación antes de habilitar el acceso.
- **Contenedores listos para producción**: `docker-compose` orquesta Postgres, Redis, backend y frontend (sirviendo el build estático con Nginx).

## Demostración end-to-end
1. **Start**: `./scripts/start.sh | docker compose up --build -d` construye y levanta los servicios.
   <img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/507a4f18-52ec-44c7-a81e-bd0a64c1051f" />
2. **Script**: Carga el script ./creacion_tenant.sh.
   <img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/fe41ccc5-d85a-4710-9823-cec9b9ffd4a7" />

3. **Onboarding**: Admin inicia sesión
<img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/98dd7b86-df28-4ace-91a4-eebf79abf06e" />
4. crea un hotel
<img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/cb0529d6-406c-49c9-a7f3-cce72d24125f" />

5. y registra personal/recepcionistas.
<img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/c25ad766-6df8-42d1-985f-7c95621b51e5" />

6. **Reserva**: Huésped registrado. .
   <img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/1937eecb-30ea-44f8-aff6-88b2130b5926" />

7. Huesped verificado.
    <img width="1920" height="1080" alt="imagen" src="https://github.com/user-attachments/assets/5e1f8e57-015a-40d5-a9c9-d0fbc927b6ae" />
    <img width="688" height="437" alt="imagen" src="https://github.com/user-attachments/assets/883e6b62-0795-4634-92b1-43e748ca69c4" />

8. Huesped validado encuentra disponibilidad y crea la reserva.
    <img width="1552" height="849" alt="imagen" src="https://github.com/user-attachments/assets/6b8cc57e-c016-46eb-9146-29c2cef43089" />

9. **Cobro**: Recepcionista confirma el pago; el sistema genera la boleta y marca la reserva como pagada.
    <img width="1517" height="408" alt="imagen" src="https://github.com/user-attachments/assets/de7b5db7-12c9-4ece-8f37-524a0e4b9f4a" />
    <img width="1326" height="715" alt="imagen" src="https://github.com/user-attachments/assets/d78614cb-ee46-4765-910e-b0dfbedba45d" />



Cada paso fue ejecutado durante la validación del MVP y se puede reproducir siguiendo la guía de ejecución.

## Estructura del repositorio
- `backend/` – API REST Express, configuración Redis y rutas para hoteles, usuarios, reservas, pagos, habitaciones y huéspedes.
- `frontend/react-app/` – SPA construida con React + Vite; dashboards por rol y consumo de la API.
- `frontend/vue-app/` – prototipo inicial (sin configurar) para una segunda interfaz.
- `db/init.sql` – definición completa del esquema, enums, RLS, triggers y carga inicial mínima.
- `docker/` – Dockerfiles para backend, frontend y Nginx reverso.
- `scripts/` – automatizaciones: levantar/bajar contenedores, poblar datos de ejemplo y exportar metadata de la base.
- `docs/` – espacio para documentación adicional (actualmente vacío).

### Documentación complementaria (`docs/`)
- [`docs/backend.md`](docs/backend.md) – Arquitectura del backend, routers, cache, validaciones y multi-tenancy.
- [`docs/frontend.md`](docs/frontend.md) – Organización del frontend React, componentes por rol y comunicación con la API.
- [`docs/db.md`](docs/db.md) – Diseño del esquema PostgreSQL, enums, políticas RLS y triggers de auditoría.
- [`docs/infraestructura.md`](docs/infraestructura.md) – Contenedores Docker, variables de entorno y recomendaciones de despliegue.

## Stack tecnológico
- **Backend**: Node.js 18, Express, pg, Redis, bcrypt, uuid, nodemailer.
- **Frontend**: React 19 + Vite, Bootstrap 5 vía CDN, React Router, componentes escritos en JSX moderno.
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
   El servidor escucha en `http://localhost:3000`.
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
- `POST /api/huespedes` (admin/gerente) y `POST /api/usuarios/register-huesped` (self-service) crean cuentas con contraseña y disparan verificación por correo.
- `POST /api/usuarios/resend-verification` y `GET /api/usuarios/verify-email` completan el flujo de confirmación antes de permitir el inicio de sesión.

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
#### Autenticación Moderna - AuthPage.jsx
Nuevo componente de autenticación unificado con diseño moderno implementando:
- **UI/UX Premium**: Diseño con Tailwind CSS featuring gradients, backdrop-blur, animaciones smooth
- **Login y Registro en un solo componente**: Toggle animado entre modos
- **Validación de RUT chileno**: Formato `12345678-9` o `1234567-K`
- **Integración Multi-tenant**: 
  - Selector dinámico de hoteles (carga desde API)
  - Selector de sucursales filtrado por hotel seleccionado
  - Campos específicos: nombre, teléfono, email, documento
- **Iconografía moderna**: Uso de lucide-react (Mail, Lock, User, Building2, Phone, Hotel, Waves)
- **Responsive design**: Layout adaptable mobile-first
- **Features destacadas**:
  - Animaciones de transición suaves
  - Indicadores visuales de validación
  - Mensajes de error/éxito contextuales
  - Logo animado con olas
  - Cards con glass-morphism effect

#### Dashboards por Rol
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
