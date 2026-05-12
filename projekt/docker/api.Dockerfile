FROM node:20-alpine

WORKDIR /app

RUN npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund \
       express \
       helmet \
       cors \
       cookie-parser \
       socket.io \
       uuid \
       mssql \
       mongodb

# Kod backendu
COPY src/api/server.js ./server.js

# Healthcheck wewnątrz kontenera (wget jest dostępne w obrazie alpine).
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=40s \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

EXPOSE 4000

# Plik server.js używa importów ESM
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.type='module';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

# Plik server.js w /app/src/api/
RUN mkdir -p /app/src/api && mv /app/server.js /app/src/api/server.js

CMD ["node", "src/api/server.js"]
