import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// Firebase Admin (credenciais padrão do Cloud Run), inicializado sob demanda.
async function getFirebaseAdmin() {
  const { initializeApp, applicationDefault, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore } = await import("firebase-admin/firestore");
  const adminApp = getApps()[0] || initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || "jrs-app-web",
    serviceAccountId: process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL || undefined,
  });
  return { adminAuth: getAuth(adminApp), adminDb: getFirestore(adminApp) };
}

// Senha inicial padrão (ver config/senha.ts no frontend).
const SENHA_INICIAL_PADRAO = "123456";

// Limitação simples de tentativas por IP para a consulta de NIP (anônima).
const consultasNip = new Map<string, { n: number; desde: number }>();
const limitarConsultaNip = (ip: string): boolean => {
  const agora = Date.now();
  const reg = consultasNip.get(ip);
  if (!reg || agora - reg.desde > 60_000) { consultasNip.set(ip, { n: 1, desde: agora }); return true; }
  reg.n += 1;
  return reg.n <= 30;
};

async function startServer() {
  const app = express();
  // Cloud Run injeta a porta via a variável de ambiente PORT (normalmente
  // 8080) — o container precisa escutar nela, não numa porta fixa.
  const PORT = Number(process.env.PORT) || 3000;

  // O frontend é publicado como site estático no GitHub Pages (ver
  // .github/workflows/deploy.yml) e por isso roda numa origem diferente
  // deste servidor (aqui hospedado no Cloud Run) — sem CORS liberado o
  // navegador bloqueia as chamadas a /api/*. ALLOWED_ORIGIN pode ser
  // sobrescrita (ex.: domínio próprio) via variável de ambiente no Cloud Run.
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://mauriston.github.io";
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // Passagem de login desktop -> celular (QR code de "Instalar app", ver
  // components/InstallAppQrDialog.tsx). O Firebase Auth não exporta a sessão
  // do navegador, então o desktop (já logado) pede aqui um *custom token*
  // para o PRÓPRIO usuário: o ID token dele é verificado e um token de uso
  // único-ish (válido por até 1h, trafega só no fragmento "#" da URL do QR,
  // nunca enviado a servidores) é emitido para o celular trocá-lo por uma
  // sessão via signInWithCustomToken. Requer, no Cloud Run, que a service
  // account do serviço tenha o papel "Service Account Token Creator" sobre
  // si mesma (permite assinar o custom token com credenciais padrão).
  app.post("/api/auth/handoff-token", async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) {
        res.status(401).json({ success: false, error: "Token ausente." });
        return;
      }
      const { adminAuth } = await getFirebaseAdmin();
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      const token = await adminAuth.createCustomToken(decoded.uid);
      res.json({ success: true, token });
    } catch (error: any) {
      console.error("Handoff token error:", error);
      res.status(401).json({ success: false, error: "Não foi possível gerar o acesso para o celular." });
    }
  });

  // Login por NIP: devolve o usuário (login) e se ainda usa a senha inicial,
  // para o frontend autenticar no Firebase e orientar quem errou a senha.
  // Não expõe nenhum outro dado do cadastro.
  app.post("/api/auth/resolver-nip", async (req, res) => {
    try {
      if (!limitarConsultaNip(String(req.ip || "?"))) {
        res.status(429).json({ success: false, error: "Muitas tentativas. Aguarde um pouco." });
        return;
      }
      const digitos = String(req.body?.nip || "").replace(/\D/g, "");
      if (digitos.length !== 8) {
        res.status(400).json({ success: false, error: "NIP inválido." });
        return;
      }
      const formatado = `${digitos.slice(0, 2)}.${digitos.slice(2, 6)}.${digitos.slice(6)}`;
      const { adminDb } = await getFirebaseAdmin();
      let doc = (await adminDb.collection("usuarios").where("nip", "==", formatado).limit(1).get()).docs[0];
      if (!doc) doc = (await adminDb.collection("usuarios").where("nip", "==", digitos).limit(1).get()).docs[0];
      if (!doc) {
        res.status(404).json({ success: false, error: "NIP não encontrado." });
        return;
      }
      const d = doc.data();
      res.json({ success: true, usuario: d.usuario, ativo: d.ativo !== false, senhaTemporaria: !!d.senhaTemporaria });
    } catch (error: any) {
      console.error("Resolver NIP error:", error);
      res.status(500).json({ success: false, error: "Não foi possível consultar o NIP. Tente novamente." });
    }
  });

  // Admin redefine a senha de um usuário para a senha inicial padrão. O ID
  // token do solicitante é verificado e o perfil "admin" é conferido no
  // Firestore; a senha é trocada via Admin SDK e a flag senhaTemporaria volta
  // a true (o app volta a orientar a troca no próximo acesso).
  app.post("/api/admin/resetar-senha", async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) {
        res.status(401).json({ success: false, error: "Token ausente." });
        return;
      }
      const { adminAuth, adminDb } = await getFirebaseAdmin();
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      const solicitante = await adminDb.collection("usuarios").doc(decoded.uid).get();
      if (!solicitante.exists || solicitante.data()?.perfil !== "admin") {
        res.status(403).json({ success: false, error: "Apenas o Admin pode redefinir senhas." });
        return;
      }
      const uid = String(req.body?.uid || "");
      if (!uid) {
        res.status(400).json({ success: false, error: "Usuário não informado." });
        return;
      }
      const alvo = await adminDb.collection("usuarios").doc(uid).get();
      if (!alvo.exists) {
        res.status(404).json({ success: false, error: "Usuário não encontrado." });
        return;
      }
      await adminAuth.updateUser(uid, { password: SENHA_INICIAL_PADRAO });
      await adminDb.collection("usuarios").doc(uid).update({ senhaTemporaria: true });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Resetar senha error:", error);
      res.status(500).json({ success: false, error: "Não foi possível redefinir a senha." });
    }
  });

  app.post("/api/gemini/analyze-image", async (req, res) => {
    try {
      const { image, prompt } = req.body; // image as base64 string
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      };
      
      const textPart = {
        text: prompt || "Extraia informações relevantes dessa imagem",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts: [imagePart, textPart] },
      });

      res.json({ success: true, text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Transcrição literal do PDF da mensagem administrativa (SIGAD-MB) do menu
  // Concursos, usada no lugar do OCR do Google Drive (Apps Script). O texto
  // devolvido é interpretado no cliente pelos mesmos regex já validados de
  // CodeConcursos.gs (ver utils/concursosUtils.ts) — este endpoint só
  // transcreve, nunca interpreta ou resume o conteúdo.
  app.post("/api/concursos/ocr-pdf", async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const filePart = {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBase64,
        },
      };

      const textPart = {
        text: [
          'Transcreva TODO o texto deste documento de forma EXATA E LITERAL, do início ao fim.',
          'Não resuma, não parafraseie, não corrija erros de digitação nem formate como Markdown.',
          'Preserve números, matrículas, datas e nomes exatamente como aparecem no documento, mantendo as quebras de linha originais sempre que possível.',
          'Responda apenas com o texto transcrito, sem nenhum comentário ou explicação adicional.',
        ].join(' '),
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts: [filePart, textPart] },
      });

      res.json({ success: true, texto: response.text });
    } catch (error: any) {
      console.error("Gemini OCR error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    // Import dinâmico: em produção (Cloud Run) o container não tem o pacote
    // "vite" instalado (é devDependency, removido por "npm ci --omit=dev"),
    // e um import estático travaria o processo antes mesmo de ele escutar
    // na porta — por isso só carregamos o módulo quando de fato em modo dev.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
