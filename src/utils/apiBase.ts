// Ficheiro: utils/apiBase.ts
// O frontend é publicado como site estático no GitHub Pages (ver
// .github/workflows/deploy.yml), que não executa código de servidor — por
// isso os endpoints de /api/* (OCR de PDF/imagem via Gemini, em server.ts)
// rodam separadamente no Cloud Run. Em produção, VITE_API_BASE_URL é
// definido em tempo de build com a URL do serviço do Cloud Run; em
// desenvolvimento local (npm run dev, que roda o Express com o Vite em modo
// middleware) fica em branco e as chamadas usam caminho relativo, já que
// frontend e backend são servidos pela mesma origem.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const apiUrl = (path: string): string => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
