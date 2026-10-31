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

  // Admin apaga definitivamente um usuário INATIVO: remove a conta do Firebase
  // Auth e os documentos "usuarios" e "usuarios_publicos". Perfil admin e
  // status inativo são conferidos no servidor; ninguém apaga a própria conta.
  app.post("/api/admin/excluir-usuario", async (req, res) => {
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
        res.status(403).json({ success: false, error: "Apenas o Admin pode excluir usuários." });
        return;
      }
      const uid = String(req.body?.uid || "");
      if (!uid) {
        res.status(400).json({ success: false, error: "Usuário não informado." });
        return;
      }
      if (uid === decoded.uid) {
        res.status(400).json({ success: false, error: "Você não pode excluir a própria conta." });
        return;
      }
      const alvo = await adminDb.collection("usuarios").doc(uid).get();
      if (!alvo.exists) {
        res.status(404).json({ success: false, error: "Usuário não encontrado." });
        return;
      }
      if (alvo.data()?.ativo !== false) {
        res.status(409).json({ success: false, error: "Só é possível excluir usuários inativos." });
        return;
      }
      try {
        await adminAuth.deleteUser(uid);
      } catch (e: any) {
        if (e?.code !== "auth/user-not-found") throw e;
      }
      await adminDb.collection("usuarios").doc(uid).delete();
      await adminDb.collection("usuarios_publicos").doc(uid).delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Excluir usuário error:", error);
      res.status(500).json({ success: false, error: "Não foi possível excluir o usuário." });
    }
  });

  // Notificações push (Firebase Cloud Messaging). O app só avisa que algo
  // aconteceu (services/notificacoesPush.ts); aqui o evento é conferido no
  // Firestore, o texto é montado, os destinatários escolhidos e a repetição
  // evitada (coleção "notificacoes_enviadas", só acessível pelo servidor).
  // Os tokens dos aparelhos ficam em "tokens_push/{token}" com o uid do dono.
  const APP_URL = (process.env.APP_URL || "https://mauriston.github.io/DoencasEPareceresJRS/").replace(/\/?$/, "/");
  // Só segura chamadas duplicadas do mesmo acesso (ex.: recarga imediata).
  const INTERVALO_AVISO_LOGIN_MS = 60_000;

  /** Grava a chave de "já enviado"; false se outra requisição já enviou. */
  const marcarEnvio = async (adminDb: any, chave: string): Promise<boolean> => {
    try {
      await adminDb.collection("notificacoes_enviadas").doc(chave).create({ em: new Date() });
      return true;
    } catch (e: any) {
      if (e?.code === 6) return false; // ALREADY_EXISTS
      throw e;
    }
  };

  // Toda notificação também fica guardada para cada destinatário em
  // usuarios/{uid}/notificacoes/{id} (menu do avatar, com badge de não lidas).
  // O mesmo id vai no link do push (?notif=id): abrir pelo push marca como lida.
  // O título do push é o tipo do aviso; o nome do app ("JRS/HNRe App", do
  // manifest) já aparece na notificação — no iOS, como "from JRS/HNRe App".
  const enviarPush = async (
    adminDb: any,
    destino: { uids: Set<string> },
    msg: { titulo: string; corpo: string; rota?: string },
  ) => {
    const { getMessaging } = await import("firebase-admin/messaging");
    const id = adminDb.collection("notificacoes_enviadas").doc().id;
    const rota = msg.rota || "/";
    const em = new Date();
    const uids = [...destino.uids];
    for (let i = 0; i < uids.length; i += 400) {
      const batch = adminDb.batch();
      uids.slice(i, i + 400).forEach(uid => batch.set(
        adminDb.collection("usuarios").doc(uid).collection("notificacoes").doc(id),
        { titulo: msg.titulo, corpo: msg.corpo, rota, lida: false, em },
      ));
      await batch.commit();
    }
    const snap = await adminDb.collection("tokens_push").get();
    const tokens: string[] = snap.docs.filter((d: any) => destino.uids.has(d.data().uid)).map((d: any) => d.id);
    let enviados = 0;
    const erros: string[] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const lote = tokens.slice(i, i + 500);
      const resp = await getMessaging().sendEachForMulticast({
        tokens: lote,
        notification: { title: msg.titulo, body: msg.corpo },
        data: { notifId: id, rota },
        webpush: {
          notification: { icon: `${APP_URL}icons/notificacao-192.png`, badge: `${APP_URL}icons/badge-96.png`, lang: "pt-BR" },
          fcmOptions: { link: `${APP_URL}?notif=${id}#${rota}` },
        },
      });
      // Aparelhos que desinstalaram o app ou revogaram a permissão: o token morreu.
      enviados += resp.successCount;
      resp.responses.forEach((r, j) => {
        const code = r.error?.code || "";
        if (r.error) erros.push(`${code}: ${r.error.message}`);
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          adminDb.collection("tokens_push").doc(lote[j]).delete().catch(() => {});
        }
      });
    }
    if (erros.length) console.error("Push com falhas:", erros);
    return { aparelhos: tokens.length, enviados, erros };
  };

  const uidsAtivos = async (adminDb: any, filtro?: (u: any) => boolean): Promise<Set<string>> => {
    const snap = await adminDb.collection("usuarios").get();
    return new Set(snap.docs.filter((d: any) => d.data().ativo !== false && (!filtro || filtro(d.data()))).map((d: any) => d.id));
  };

  const hojeRecife = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date()); // AAAA-MM-DD

  app.post("/api/notificacoes/evento", async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) {
        res.status(401).json({ success: false, error: "Token ausente." });
        return;
      }
      const { adminAuth, adminDb } = await getFirebaseAdmin();
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      const ator = (await adminDb.collection("usuarios").doc(decoded.uid).get()).data();
      if (!ator || ator.ativo === false) {
        res.status(403).json({ success: false, error: "Usuário inativo." });
        return;
      }
      const nomeAtor = String(ator.usuario || ator.nome || "Usuário");
      const tipo = String(req.body?.tipo || "");

      // "{{usuario}} logado." — só para o Admin, quando um não-Admin abre o app.
      if (tipo === "login") {
        if (ator.perfil === "admin") { res.json({ success: true, enviado: false }); return; }
        const ref = adminDb.collection("notificacoes_enviadas").doc(`login_${decoded.uid}`);
        const ultimo = (await ref.get()).data()?.em?.toDate?.() as Date | undefined;
        if (ultimo && Date.now() - ultimo.getTime() < INTERVALO_AVISO_LOGIN_MS) { res.json({ success: true, enviado: false }); return; }
        await ref.set({ em: new Date() });
        await enviarPush(adminDb, { uids: await uidsAtivos(adminDb, u => u.perfil === "admin") }, {
          titulo: "Acesso ao app",
          corpo: `${nomeAtor} logado.`,
        });
        res.json({ success: true, enviado: true });
        return;
      }

      // Concursos: status alterado para Inapto/IDM (aviso imediato) e IS
      // finalizada (confere se todas as IS daquele dia terminaram).
      if (tipo === "status-alterado" || tipo === "is-finalizada") {
        const concursoId = String(req.body?.concursoId || "");
        const candidatoId = String(req.body?.candidatoId || "");
        if (!concursoId || !candidatoId || concursoId.includes("/") || candidatoId.includes("/")) {
          res.status(400).json({ success: false, error: "Evento inválido." });
          return;
        }
        const concursoRef = adminDb.collection("concursos").doc(concursoId);
        const [concursoSnap, candSnap] = await Promise.all([concursoRef.get(), concursoRef.collection("candidatos").doc(candidatoId).get()]);
        const cand = candSnap.data();
        if (!concursoSnap.exists || !cand) { res.json({ success: true, enviados: [] }); return; }
        const nomeConcurso = String(concursoSnap.data()?.nome || concursoId);
        const rota = `/concursos/${encodeURIComponent(concursoId)}`;
        const todos = await uidsAtivos(adminDb);
        const data = String(cand.dataAgendamento || "");
        const enviados: string[] = [];

        const status = String(cand.status || "").toUpperCase();
        const laudo = status === "INAPTO" ? "laudo de inaptidão" : status === "INSUF DOCUMENTAL" ? "IDM" : "";
        if (tipo === "status-alterado" && laudo && await marcarEnvio(adminDb, `${status === "INAPTO" ? "inapto" : "idm"}_${concursoId}_${candidatoId}_${data}`)) {
          await enviarPush(adminDb, { uids: todos }, {
            titulo: status === "INAPTO" ? "Laudo de inaptidão" : "IDM",
            corpo: `${nomeAtor} exarou ${laudo} no ${nomeConcurso}`,
            rota,
          });
          enviados.push(status);
        }

        if (tipo === "is-finalizada" && cand.finalizado && data) {
          const doDia = await concursoRef.collection("candidatos").where("dataAgendamento", "==", data).get();
          const todasFinalizadas = doDia.size > 0 && doDia.docs.every((d: any) => d.data().finalizado === true);
          if (todasFinalizadas && await marcarEnvio(adminDb, `dia_${concursoId}_${data}`)) {
            const quando = data === hojeRecife() ? "de hoje" : `de ${data.split("-").reverse().join("/")}`;
            await enviarPush(adminDb, { uids: todos }, {
              titulo: "IS do dia finalizadas",
              corpo: `As IS do ${nomeConcurso} ${quando} foram finalizadas`,
              rota,
            });
            enviados.push("dia");
          }
        }
        res.json({ success: true, enviados });
        return;
      }

      // Teste (Meu perfil): manda um aviso só para os aparelhos do próprio usuário.
      if (tipo === "teste") {
        const n = await enviarPush(adminDb, { uids: new Set([decoded.uid]) }, {
          titulo: "Notificação de teste",
          corpo: `Tudo certo, ${nomeAtor}: as notificações estão chegando neste aparelho.`,
        });
        res.json({ success: true, ...n });
        return;
      }

      res.status(400).json({ success: false, error: "Tipo de evento desconhecido." });
    } catch (error: any) {
      console.error("Notificação push error:", error);
      res.status(500).json({ success: false, error: "Não foi possível enviar a notificação." });
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

  // Prévia de uma apresentação de slides (página Apresentações): o Admin informa a URL e o
  // servidor lê o HTML público para tirar o título e a imagem de capa (og:title/og:image),
  // o que o navegador não consegue por CORS. Só Admin e só hosts de apresentação conhecidos
  // (Google Slides, Canva, GitHub Pages), inclusive nos redirecionamentos — evita usar o
  // servidor como proxy aberto.
  const hostApresentacaoPermitido = (u: URL) =>
    u.protocol === "https:" &&
    (u.hostname === "docs.google.com" || u.hostname === "canva.com" || u.hostname === "www.canva.com" || /^[a-z0-9-]+\.github\.io$/i.test(u.hostname));
  const metaDoHtml = (html: string, nomes: string[]): string => {
    for (const nome of nomes) {
      const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${nome}["'][^>]*content=["']([^"']*)["']`, "i");
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${nome}["']`, "i");
      const m = html.match(re1) || html.match(re2);
      if (m?.[1]) return m[1];
    }
    return "";
  };
  const decodificarEntidades = (t: string) => t
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

  app.post("/api/admin/preview-apresentacao", async (req, res) => {
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
        res.status(403).json({ success: false, error: "Apenas o Admin pode adicionar apresentações." });
        return;
      }
      let alvo: URL;
      try { alvo = new URL(String(req.body?.url || "")); } catch { res.status(400).json({ success: false, error: "URL inválida." }); return; }
      if (!hostApresentacaoPermitido(alvo)) {
        res.status(400).json({ success: false, error: "Use uma URL do Google Slides, do Canva ou do GitHub Pages." });
        return;
      }
      // Segue até 4 redirecionamentos, conferindo o host em cada um.
      let resp: Response | null = null;
      for (let i = 0; i < 5; i++) {
        resp = await fetch(alvo, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Mozilla/5.0 (compatible; JRS-HNRe-Preview/1.0)", "Accept-Language": "pt-BR,pt;q=0.9" } });
        const destino = resp.status >= 300 && resp.status < 400 ? resp.headers.get("location") : null;
        if (!destino) break;
        alvo = new URL(destino, alvo);
        if (!hostApresentacaoPermitido(alvo)) {
          res.status(422).json({ success: false, error: "A apresentação não está pública (pede login). Compartilhe como \"qualquer pessoa com o link\"." });
          return;
        }
      }
      if (!resp || !resp.ok) {
        res.status(422).json({ success: false, error: "Não foi possível abrir a URL da apresentação." });
        return;
      }
      const html = (await resp.text()).slice(0, 1_500_000);
      let titulo = decodificarEntidades(metaDoHtml(html, ["og:title", "twitter:title"]) || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "")).trim();
      titulo = titulo.replace(/\s+[-–|]\s+(Apresentações Google|Google Slides|Canva)$/i, "").trim();
      const imagem = decodificarEntidades(metaDoHtml(html, ["og:image", "og:image:url", "twitter:image"]));
      res.json({ success: true, titulo, imagem: imagem ? new URL(imagem, alvo).toString() : "" });
    } catch (error: any) {
      console.error("Preview apresentacao error:", error);
      res.status(500).json({ success: false, error: "Não foi possível ler a apresentação." });
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
