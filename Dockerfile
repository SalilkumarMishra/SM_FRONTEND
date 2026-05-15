# syntax=docker/dockerfile:1.7

# Stage 1: install dependencies and build the Vite React application.
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first so Docker can cache npm install layers.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run lint
RUN npm run build

# Stage 2: serve the compiled static assets with Nginx.
FROM nginx:1.27-alpine AS production

LABEL org.opencontainers.image.title="Savemore Frontend"
LABEL org.opencontainers.image.description="Vite React frontend served by Nginx"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
