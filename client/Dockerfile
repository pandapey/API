# Build stage
FROM node:20-alpine AS build
WORKDIR /app
# Reproducible installs + cache-friendly layer
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# VITE_* is baked at build time — pass via --build-arg in CI/prod.
ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_GATEWAY_URL=http://localhost:5000/gateway
ARG VITE_SOCKET_URL=http://localhost:5000
ARG VITE_DOCS_URL=http://localhost:5000/api-docs
ENV VITE_API_URL=$VITE_API_URL VITE_GATEWAY_URL=$VITE_GATEWAY_URL VITE_SOCKET_URL=$VITE_SOCKET_URL VITE_DOCS_URL=$VITE_DOCS_URL
RUN npm run build

# Serve stage
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  location /api/ { proxy_pass http://backend:5000; proxy_set_header Host $host; }
  location /api-docs { proxy_pass http://backend:5000; proxy_set_header Host $host; }
  location /gateway/ { proxy_pass http://backend:5000; proxy_set_header Host $host; }
  location /health { proxy_pass http://backend:5000; proxy_set_header Host $host; }
}
EOF
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
