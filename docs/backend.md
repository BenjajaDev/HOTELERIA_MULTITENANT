# Backend

## Visión general
El backend está construido sobre **Node.js 18** y **Express** (`backend/server.js`). Expone una API REST multi-tenant que orquesta hoteles, habitaciones, reservas, pagos y huéspedes. Se apoya en **PostgreSQL** (a través de `pg.Pool`) y en **Redis** para cachear datos frecuentemente consultados.

## Configuración base
- `server.js` inicializa Express, habilita CORS permisivo, parsea cuerpos JSON y registra los routers especializados.
- Las variables de entorno (`POSTGRES_*`, `REDIS_*`, `PORT`) se inyectan vía Docker Compose o shell. Si no existen, el backend asume valores por defecto (postgres/postgres, host `db`, puerto `4000`).
- `models/db.js` crea un pool de conexiones reutilizable hacia Postgres.
- `models/redisClient.js` centraliza la conexión a Redis, permite reconectar automáticamente y cierra la sesión de forma ordenada al recibir señales SIGINT/SIGTERM.

## Routers y responsabilidades
| Router | Ubicación | Responsabilidad principal |
| ------ | --------- | ------------------------- |
| Hoteles | `routes/hoteles.js` | CRUD completo, creación automática de tenants, cache en Redis, invalidación selectiva. |
| Usuarios | `routes/usuarios.js` | Autenticación con bcrypt, registro de huéspedes, asignación de roles (`tenant_usuario`), gestión de huéspedes administrativos. |
| Reservas | `routes/reservas.js` | Control de disponibilidad, cálculo de noches, integración con pagos y detalle de pago, transacciones complejas. |
| Pagos | `routes/pagos.js` | Consulta y actualización de `detalle_pago`, generación de boletas imprimibles y filtros por hotel/estado/método. |
| Habitaciones | `routes/gestion_habitaciones.js` | Inventory management por hotel, validación de rol (`admin` o `recepcionista`), verificación de solapamientos. |
| Huéspedes | `routes/huespedes.js` | Panel combinado entre fichas (`huesped`) y usuarios con rol de huésped, histórico de reservas, edición controlada. |

Cada router declara utilidades para encapsular SQL repetitivo (`fetchHotelById`, `fetchReservaById`, etc.) y emplea transacciones (`BEGIN` / `COMMIT` / `ROLLBACK`) cuando se modifican múltiples tablas relacionadas.

## Flujo multi-tenant
1. El usuario se autentica contra `/api/usuarios/login`, recibiendo su `usuario_id`, rol y tenant/hotel asignado.
2. Los dashboards del frontend adjuntan `tenantId`, `usuarioId` y `hotelId` en cada petición que lo requiere.
3. Los routers validan la pertenencia del usuario al tenant mediante consultas a `tenant_usuario` y rechazan accesos indebidos con HTTP 403.
4. Las consultas SQL incluyen filtros por `tenant_id`/`hotel_id` y delegan el aislamiento al **Row Level Security** de Postgres.

## Cache con Redis
- El listado de hoteles (`GET /api/hoteles`) se guarda bajo la llave `cache:hoteles:list` durante 60 segundos.
- Al crear/editar/eliminar un hotel se invalidan las claves globales y específicas (`cache:hoteles:id:${id}`).
- Se usa `redis.setEx` para establecer TTL y `redis.del` en invalidaciones múltiples con `Promise.all`.

## Validaciones destacadas
- **Usuarios**: normalización de teléfono y documento (RUT) antes de persistir; verificación de unicidad de email.
- **Habitaciones**: número entero positivo, etiquetas permitidas (`simple`, `doble`, `suite`), estado válido y precio mayor o igual a cero.
- **Reservas**: fechas en orden cronológico, cálculo de noches mínimo de 1, verificación de disponibilidad para evitar solapamientos, métodos de pago soportados.
- **Pagos**: sincronización de montos con la reserva, normalización de referencias y persistencia de detalles ficticios para comprobar flujos.

## Manejo de errores
- Todas las rutas capturan excepciones y responden JSON (`{ error: mensaje }`) con códigos 4xx/5xx apropiados.
- Las operaciones transaccionales hacen `ROLLBACK` ante fallos para mantener consistencia referencial.
- Se registran trazas en consola para facilitar la depuración; en un entorno productivo se recomienda redirigirlas a un servicio de observabilidad.

## Auditoría y rastreo
- Los triggers declarados en `db/init.sql` (`reserva_audit`, `pago_audit`) guardan cada mutación en `audit_log`, incluyendo payload antes/después.
- Las rutas de pagos complementan esta pista escribiendo en `detalle_pago`, lo que permite construir boletas y reportes financieros.

## Extensiones sugeridas
- Implementar tokens JWT u otra capa de autenticación fuerte (actualmente se retorna información de usuario sin token persistente).
- Integrar pruebas unitarias y de integración (por ejemplo, usando Jest o Supertest) para servicios críticos como reservas y pagos.
- Incorporar métricas y rate limiting para proteger los endpoints de abuso y monitorear tiempos de respuesta.
