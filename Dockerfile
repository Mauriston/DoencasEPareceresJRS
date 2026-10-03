# Imagem do backend (server.ts) para o Cloud Run — o frontend (build do
# Vite) é publicado separadamente como site estático no GitHub Pages (ver
# .github/workflows/deploy.yml). Este container só precisa dos endpoints
# /api/* que falam com o Gemini (OCR de PDF/imagem).

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# Cloud Run injeta a variável PORT (padrão 8080) — server.ts já lê
# process.env.PORT, então não é preciso fixar aqui além de documentar.
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
