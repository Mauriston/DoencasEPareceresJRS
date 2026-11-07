# Imagem do backend (server.ts) para o Cloud Run — o frontend (build do
# Vite) é publicado separadamente como site estático no GitHub Pages (ver
# .github/workflows/deploy.yml). Este container serve os endpoints /api/*
# (login, Admin, notificações, Gemini, repasse de arquivos e documentos em PDF).

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Execução em Debian (slim): o Chromium e a fonte Carlito (métrica da Calibri, a dos templates oficiais)
# vêm dos pacotes do sistema — usados para gerar os documentos em HTML + CSS → PDF
# (servidor/documentos/gerarPdf.ts). fonts-liberation cobre Arial/Times se algum modelo usar.
FROM node:20-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-crosextra-carlito fonts-liberation \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/chromium
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# Cloud Run injeta a variável PORT (padrão 8080) — server.ts já lê
# process.env.PORT, então não é preciso fixar aqui além de documentar.
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
