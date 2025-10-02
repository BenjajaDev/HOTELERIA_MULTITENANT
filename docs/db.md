# Base de Datos

## Motor y versión
- **PostgreSQL 15** (contenedor oficial) con extensión `uuid-ossp` para generar identificadores UUID v4.
- El script `db/init.sql` crea el esquema completo, enums, políticas de Row Level Security (RLS), triggers de auditoría y datos auxiliares.

## Esquema principal
| Tabla | Propósito | Observaciones |
| ----- | --------- | ------------- |
| `tenant` | Agrupa entidades bajo un mismo cliente/hotel corporativo. | Identificador UUID y nombre obligatorio. |
| `usuario` | Credenciales y datos básicos de personas registradas. | Almacena `password_hash` y fecha de creación. |
| `tenant_usuario` | Relación N:M entre usuarios y tenants. | Usa `rol_enum` (`admin`, `recepcionista`, `huesped`). |
| `hotel` | Hoteles operados por cada tenant. | Incluye datos de contacto y `created_at`. |
| `habitacion` | Inventario de habitaciones por hotel. | Campos `numero`, `tipo` (`tipo_habitacion_enum`), `precio_noche` y `estado`. |
| `huesped` | Fichas de huéspedes persistentes (con teléfono/documento). | Comparte `huesped_id` con usuarios cuando son la misma persona. |
| `reserva` | Reservas de habitaciones. | Ligada a `habitacion` y `huesped`, guarda fechas, estado (`estado_reserva_enum`) y total. |
| `pago` | Pagos asociados a reservas. | Campos `metodo` (`metodo_pago_enum`), `estado` (`estado_pago_enum`) y timestamp. |
| `detalle_pago` | Información complementaria de pagos. | Tiene relación 1:1 con `pago` y almacena descripciones, referencias y comprobantes. |
| `audit_log` | Bitácora de cambios. | Inserta registros mediante triggers en `reserva` y `pago`. |
| Tablas adicionales | `sucursal`, `venta`, `tour`, `asiento`, etc. | Preparan la base para futuras ampliaciones (ventas de tours, transporte, etc.). |

## Enumeraciones
- `rol_enum`: `admin`, `recepcionista`, `huesped`.
- `tipo_habitacion_enum`: `simple`, `doble`, `suite`.
- `estado_habitacion_enum`: `disponible`, `ocupada`, `limpieza`.
- `estado_reserva_enum`: `pendiente`, `confirmada`, `cancelada`.
- `metodo_pago_enum`: `tarjeta`, `efectivo`, `transferencia`.
- `estado_pago_enum`: `pagado`, `pendiente`.

## Row Level Security (RLS)
1. Se habilita RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) en tablas núcleo (`hotel`, `habitacion`, `huesped`, `reserva`, `pago`, `detalle_pago`).
2. Se define una política genérica `tenant_isolation_*` que compara `tenant_id` con `current_setting('app.current_tenant')::uuid`.
3. Para `detalle_pago`, la política verifica que el pago vinculado pertenezca al tenant.

> Para que las políticas surtan efecto, el backend debe establecer `SET app.current_tenant = '<tenant_uuid>'` en cada conexión. Actualmente las consultas incluyen filtros explícitos por tenant y la RLS actúa como barrera adicional.

## Triggers de auditoría
- `log_reserva_changes()` registra `INSERT`, `UPDATE` y `DELETE` sobre `reserva` en la tabla `audit_log`. Guarda `action`, `record_id` y un JSONB (`extra`) con la fila completa.
- `log_pago_changes()` replica la lógica para `pago`.
- Los triggers (`reserva_audit`, `pago_audit`) se recrean en el script para asegurar que existan incluso tras modificaciones.

## Semillas y utilidades
- `scripts/creacion_tenant.sh` y `scripts/creacion_SQL.bat` insertan dos tenants ejemplo (Hotel Stella y Hotel Madero), usuarios por rol con contraseñas hasheadas (`123456`), habitaciones iniciales y fichas de huéspedes.
- `scripts/resultados_consultas_postgreSQL.sh` exporta metadatos del esquema (columnas, PK/FK, índices, políticas, enums, funciones) en CSV usando `psql --csv`.

## Integridad referencial
- Claves foráneas con `ON DELETE CASCADE` aseguran que al eliminar un tenant/hotel se limpien relaciones dependientes.
- Operaciones que puedan dejar datos huérfanos (ej. eliminar hotel) se envuelven en transacciones en el backend para borrar relaciones en orden y registrar métricas (`usuariosEliminados`).

## Consideraciones para producción
- Evaluar particionar tablas de alto volumen (`reserva`, `pago`, `audit_log`) por fecha o `tenant_id` si crece el tráfico.
- Configurar índices adicionales (por ejemplo, en `habitacion (hotel_id, tenant_id, estado)` y `reserva (habitacion_id, fecha_inicio, fecha_fin)`) para acelerar filtros frecuentes.
- Activar backups regulares (base + Redis si se usan datos críticos en cache).
- Controlar `app.current_tenant` desde el backend con `SET LOCAL` por cada petición para reforzar el aislamiento sin depender de filtros manuales.
