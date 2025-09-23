FROM nginx:1.25-alpine
COPY ./backend/nginx.conf /etc/nginx/nginx.conf