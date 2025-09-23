FROM node:18-alpine as build
WORKDIR /app
COPY ./react-app/package*.json ./react-app/
RUN cd react-app && npm install
COPY ./frontend/react-app ./react-app
RUN cd react-app && npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/react-app/dist /usr/share/nginx/html
EXPOSE 80