# Infraestructura y despliegue

## Contenedores
El proyecto cuenta con un `docker-compose.yml` que orquesta cuatro servicios:

| Servicio | Imagen base | Puerto expuesto | Descripción |
| -------- | ----------- | --------------- | ----------- |
| `db` | `postgres:15` | 5432 | Base de datos principal. Monta `db/init.sql` como script de inicialización y persiste datos en el volumen `db_data`. |
| `redis` | `redis:7-alpine` | 6379 | Cache en memoria. Se ejecuta con AOF y snapshots deshabilitados para simplificar el entorno de desarrollo. |
| `backend` | Build `docker/backend.Dockerfile` | 4000 | API Node.js que consume Postgres y Redis. Se construye instalando dependencias y ejecutando `npm start`. |
| `frontend` | Build `docker/frontend.Dockerfile` | 3000 | Build estático de React servido con Nginx (`dist` hacia `/usr/share/nginx/html`). |

Los scripts auxiliares (`scripts/start.sh`, `scripts/stop.sh`) encapsulan los comandos `docker-compose up --build -d` y `docker-compose down` respectivamente.

## Dockerfiles
- **Backend** (`docker/backend.Dockerfile`):
  - Usa `node:18-alpine`.
  - Copia `package*.json`, instala dependencias y luego copia el resto del código.
  - Expone el puerto `4000` y ejecuta `npm start`.
- **Frontend** (`docker/frontend.Dockerfile`):
  - Fase de build con `node:22-alpine` para instalar dependencias y generar `dist` mediante `npm run build`.
  - Fase final con `nginx:1.25-alpine` que sirve archivos estáticos.
- **Nginx reverso** (`docker/nginx.Dockerfile`):
  - Copia `backend/nginx.conf` a la imagen oficial de Nginx. Útil si se quiere levantar un proxy adicional.

## Variables de entorno
| Variable | Uso | Servicio |
| -------- | --- | -------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciales para Postgres. | `db`, `backend` |
| `POSTGRES_HOST` | Hostname del contenedor de Postgres. | `backend` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Credenciales de Redis. | `backend` |
| `PORT` | Puerto en el que escucha Express. | `backend` |
| `VITE_API_URL` | URL de la API consumida por la SPA. | `frontend` (archivo `.env.local`) |

## Flujos de despliegue sugeridos
1. **Desarrollo local**
   - Usar `./scripts/start.sh` para levantar stack completo.
   - Ejecutar `npm run dev` en `frontend/react-app` si se desea hot reload sin reconstruir la imagen.
2. **Staging/Producción**
   - Construir las imágenes con tags versionados (p. ej. `docker build -t hotel-backend:v1 docker/backend.Dockerfile`).
   - Publicar en un registro (Docker Hub, ECR, etc.) y usar Compose o Kubernetes para desplegar.
   - Configurar `VITE_API_URL` apuntando al dominio público del backend.

## Observabilidad y mantenimiento
- **Logs**: Docker muestra stdout/stderr. Para entornos productivos, conectar a un agregador (ELK, Loki).
- **Backups**: el volumen `db_data` debe respaldarse periódicamente. Considerar `pg_dump`/`pg_basebackup` automatizados.
- **Monitoreo**: herramientas externas (Prometheus, Grafana) pueden consultar métricas de Postgres y Redis; el backend puede instrumentarse con middlewares de logging/latencia.
- **Escalabilidad**: separar Redis/Postgres en servicios gestionados y escalar el backend horizontalmente tras introducir balanceadores y sesiones sin estado.

## Seguridad
- Mantener contraseñas reales en variables de entorno seguras y nunca versionarlas.
- Habilitar TLS (terminación SSL) en un proxy inverso (NGINX/Traefik) cuando se exponga a Internet.
- Revisar políticas RLS tras cada migración para asegurar que el aislamiento siga activo.
- Actualizar imágenes base periódicamente para aplicar parches de seguridad.
