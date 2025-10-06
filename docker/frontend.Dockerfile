# Etapa de construcción
FROM node:22-alpine AS build
WORKDIR /app

# Copiar solo package.json y package-lock.json
COPY ./frontend/react-app/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY ./frontend/react-app ./

# Construir el proyecto
RUN npm run build

# Etapa final: Nginx para servir archivos estáticos
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]