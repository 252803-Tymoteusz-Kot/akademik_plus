## ============================================================================
##  Akademik+ — frontend Dockerfile
##
##  Etap 1: build aplikacji React/Vite (produkcyjny bundle do /dist)
##  Etap 2: lekki obraz nginx, który:
##    - serwuje statyczne pliki SPA (React Router fallback do index.html)
##    - przekazuje (proxy) /api/* oraz /socket.io/* do kontenera 'api' na :4000
## ============================================================================

# ---- Stage 1: build --------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
# package-lock.json może nie istnieć (np. po zmianach zależności) - npm install
# zadziała w obu przypadkach; npm ci wymaga obecnego lockfile.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# ---- Stage 2: serwer produkcyjny (nginx) -----------------------------------
FROM nginx:alpine

# Konfiguracja nginx: SPA + reverse proxy dla API i WebSocket.
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 3000;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback - każdy nieznany URL trafia do index.html (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # REST API
    location /api/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO (wymaga Upgrade dla WebSocket)
    location /socket.io/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
    }
}
EOF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
