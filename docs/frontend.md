# Frontend

## Stack y tooling
- **Framework**: React 19 con JSX moderno.
- **Bundler**: Vite (`frontend/react-app/vite.config.js`), lo que habilita hot module replacement y builds rápidos.
- **Estilos**: Bootstrap 5 y Bootstrap Icons cargados vía CDN en `index.html`; estilos adicionales mínimos en `src/index.css`.
- **Routing**: Se instaló `react-router-dom`, aunque los dashboards actuales funcionan sin rutas declaradas (todo se renderiza condicionalmente).

## Estructura principal
- `src/main.jsx` monta la aplicación sobre `#root` y aplica `StrictMode`.
- `src/App.jsx` mantiene el estado global del usuario, persiste datos en `localStorage` (`dh_user`) y decide qué dashboard renderizar según el rol (`admin`, `recepcionista`, `huesped`).
- `src/api.js` centraliza llamadas `fetch`, anexando encabezados JSON, construcción de query strings y manejo uniforme de errores.

## Componentes por rol
| Rol | Componentes clave | Funcionalidad destacada |
| --- | ----------------- | ----------------------- |
| Admin | `AdminDashboard`, `GestionHuespedes` | CRUD de hoteles, métricas de ingresos por hotel, listado global de reservas, gestión de huéspedes y edición inline. |
| Recepcionista | `ReceptionistDashboard`, `PagosManager`, `DetallePagoModal` | Gestión de habitaciones del hotel asignado, actualización de estados, confirmación de pagos, visualización e impresión de boletas. |
| Huésped | `GuestDashboard` | Busca disponibilidad, calcula totales en tiempo real, orquesta la “pasarela” ficticia de pagos y crea reservas. |

### Otros componentes
- `Login` y `Register` manejan autenticación inicial y registro de huéspedes, con validaciones básicas (RUT, teléfono, selección de hotel).
- `DetallePagoModal` renderiza boletas en un modal con estilos imprimibles (`@media print`).

## Flujo de datos
1. `App` recibe las credenciales del backend y almacena el objeto de usuario normalizado (`normalizeUser`).
2. Cada dashboard consume `api.js` para interactuar con los endpoints necesarios (hoteles, reservas, pagos, habitaciones, huéspedes).
3. Al crear/editar recursos, los componentes actualizan su estado local o vuelven a consultar la API para mantener los listados.
4. `PagosManager` y `GuestDashboard` formatean montos usando `Intl.NumberFormat` (`es-CL`) para representar pesos chilenos.

## Manejo de estado y UX
- El estado se gestiona con hooks (`useState`, `useEffect`, `useMemo`, `useCallback`). No se usa Redux ni context API: cada componente encapsula su propio estado.
- Se controla feedback de usuario mediante mensajes (`msg`, `reservasMsg`, etc.) y estados de carga (`loading`, `reservasLoading`, `submitting`).
- Formularios validan campos clave antes de enviar peticiones (por ejemplo, exigir selección de hotel, validar formato de RUT, número de habitación positivo).
- Los dashboards utilizan componentes de Bootstrap (`cards`, `nav-tabs`, `buttons`) para presentar la información de manera familiar.

## Integración con la API
- `api.js` expone helpers semánticos (`getHoteles`, `createHabitacion`, `getPagos`, etc.), normalizando errores (`{ error: ... }` o `res.statusText`).
- Para rutas con filtros, se construyen `URLSearchParams` y se anexan a la URL (`/api/reservas?hotelId=...`).
- En operaciones protegidas por rol, se envían `tenantId`, `usuarioId` y `hotelId` como parte del payload.

## Impresión y reportes
- `DetallePagoModal` genera vistas imprimibles de boletas con estilos específicos para `@media print`, ocultando elementos no relevantes y formateando la tabla de items con tipografía monoespaciada.

## Posibles mejoras
- Introducir React Router para separar vistas (login, dashboards) y manejar deep links.
- Extraer un contexto global para el usuario/log de auditoría que evite pasar props entre componentes.
- Incorporar librerías de gráficos (ej. Chart.js) para visualizar métricas en `AdminDashboard`.
- Migrar formularios a una librería como React Hook Form para validar y manejar errores de manera más declarativa.
- Añadir pruebas de componentes con Vitest/Testing Library para garantizar que los dashboards se actualicen correctamente al recibir nuevos datos.
