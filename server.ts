import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { logErroSeguro, descreverErro } from "./utils/logSeguro";
import { higienizarParaIA, base64ValidoParaIA } from "./utils/minimizacaoIA";
import { caminhoArquivoEquipe, caminhoArquivoValido } from "./utils/arquivosPermitidos";
import { PERFIS_ENTREVISTA } from "./config/entrevistas";
import { featurePermitida, type FeatureKey, type MatrizPermissoesArmazenada } from "./config/permissoesPadrao";
import { acaoNotificavel, perfilExecuta, recebeAvisoDaAcao, ROTA_DA_PAGINA, type AcaoNotificavel } from "./config/notificacoesAcoes";
import { AVISOS_EMAIL, AVISO_EMAIL_AGENDA_AUTOMATICO, PERFIS_AVISO_EMAIL, quantidadeIS, textoAvisoEmail, type AvisoEmail } from "./config/notificacoesEmails";

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
  return { adminAuth: getAuth(adminApp), adminDb: getFirestore(adminApp), adminApp };
}

// Bucket do Firebase Storage do app (PDFs, fotos de perfil).
const BUCKET_STORAGE = process.env.FIREBASE_STORAGE_BUCKET || "jrs-app-web.firebasestorage.app";


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

// Auditoria do servidor (LGPD, sem dados pessoais): log estruturado em JSON (o Cloud Run o indexa por
// "severity") e registro em auditoria_acoes (Firestore, só o Admin lê). Cobre acessos recusados e
// operações administrativas sensíveis. Só rota, uid e um motivo fixo: nunca corpo, NIP, nome ou token.
// Best effort: uma falha aqui nunca derruba a requisição.
const auditarServidor = async (evento: "acesso_negado" | "operacao_sensivel", rota: string, uid = "", motivo = ""): Promise<void> => {
  console.log(JSON.stringify({ severity: evento === "acesso_negado" ? "WARNING" : "NOTICE", evento, rota, uid, motivo }));
  try {
    const { adminDb } = await getFirebaseAdmin();
    await adminDb.collection("auditoria_acoes").add({ acao: `servidor.${evento}`, alvo: `${rota}${motivo ? `:${motivo}` : ""}`.slice(0, 60), uid, usuario: "", em: new Date() });
  } catch { /* só o log estruturado fica */ }
};

// Perfis da equipe da JRS (documentos dos concursos): os mesmos de PERFIS_EQUIPE no Apps Script.
const PERFIS_EQUIPE = ["admin", "user_medicos", "user_medicos_mpi", "user_secretaria"];
// Pedido de parecer (página Pareceres): só médicos, como no Apps Script e nas regras do Firestore.
const PERFIS_MEDICOS = ["admin", "user_medicos", "user_medicos_mpi"];

// Exige um ID token válido de usuário ATIVO (rotas que gastam a cota do Gemini). Responde 401/403 e
// registra a recusa; devolve o uid quando autorizado.
const exigirUsuarioAtivo = async (req: express.Request, res: express.Response, rota: string): Promise<string | null> =>
  (await exigirUsuario(req, res, rota))?.uid ?? null;

// Como exigirUsuarioAtivo, e opcionalmente restringe a uma lista de perfis. Devolve uid e perfil.
const exigirUsuario = async (req: express.Request, res: express.Response, rota: string, perfis?: string[]): Promise<{ uid: string; perfil: string } | null> => {
  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    void auditarServidor("acesso_negado", rota, "", "sem_token");
    res.status(401).json({ success: false, error: "Token ausente." });
    return null;
  }
  try {
    const { adminAuth, adminDb } = await getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const perfil = (await adminDb.collection("usuarios").doc(decoded.uid).get()).data();
    if (!perfil || perfil.ativo === false) {
      void auditarServidor("acesso_negado", rota, decoded.uid, "usuario_inativo");
      res.status(403).json({ success: false, error: "Usuário inativo." });
      return null;
    }
    if (perfis && !perfis.includes(String(perfil.perfil))) {
      void auditarServidor("acesso_negado", rota, decoded.uid, "perfil_sem_permissao");
      res.status(403).json({ success: false, error: "Seu perfil não tem permissão para esta operação." });
      return null;
    }
    return { uid: decoded.uid, perfil: String(perfil.perfil) };
  } catch {
    void auditarServidor("acesso_negado", rota, "", "token_invalido");
    res.status(401).json({ success: false, error: "Sessão inválida ou expirada." });
    return null;
  }
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Is-Id, X-Entrevista-Id");
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
        void auditarServidor("acesso_negado", "handoff-token", "", "sem_token");
        res.status(401).json({ success: false, error: "Token ausente." });
        return;
      }
      const { adminAuth } = await getFirebaseAdmin();
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      const token = await adminAuth.createCustomToken(decoded.uid);
      res.json({ success: true, token });
    } catch (error: any) {
      logErroSeguro("Handoff token error", error);
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
      logErroSeguro("Resolver NIP error", error);
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
        void auditarServidor("acesso_negado", "resetar-senha", decoded.uid, "nao_admin");
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
      void auditarServidor("operacao_sensivel", "resetar-senha", decoded.uid);
      res.json({ success: true });
    } catch (error: any) {
      logErroSeguro("Resetar senha error", error);
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
        void auditarServidor("acesso_negado", "excluir-usuario", decoded.uid, "nao_admin");
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
      void auditarServidor("operacao_sensivel", "excluir-usuario", decoded.uid);
      res.json({ success: true });
    } catch (error: any) {
      logErroSeguro("Excluir usuário error", error);
      res.status(500).json({ success: false, error: "Não foi possível excluir o usuário." });
    }
  });

  // Notificações push (Firebase Cloud Messaging). O app só avisa que algo
  // aconteceu (services/notificacoesPush.ts); aqui o evento é conferido no
  // Firestore, o texto é montado, os destinatários escolhidos e a repetição
  // evitada (coleção "notificacoes_enviadas", só acessível pelo servidor).
  // Os tokens dos aparelhos ficam em "tokens_push/{token}" com o uid do dono.
  const APP_URL = (process.env.APP_URL || "https://mauriston.github.io/DoencasEPareceresJRS/").replace(/\/?$/, "/");
  // Repetição da mesma ação (mesmo usuário, mesmo alvo) dentro desta janela não gera novo aviso.
  const INTERVALO_PADRAO_ACAO_MS = 30_000;

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
    destino: { uids: Set<string>; excluirToken?: string },
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
    const tokens: string[] = snap.docs.filter((d: any) => destino.uids.has(d.data().uid) && d.id !== destino.excluirToken).map((d: any) => d.id);
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
    if (erros.length) console.error(`Push com falhas: ${erros.length} (${[...new Set(erros.map((x: string) => x.split(":")[0]))].join(", ")})`);
    return { aparelhos: tokens.length, enviados, erros };
  };

  /**
   * E-mail enviado pela conta Google da JRS (config/notificacoesEmails.ts): avisa os Admin e a Secretaria ativos,
   * menos quem enviou (`quemUid`; null no envio automático). Best effort: quem chama não espera nem falha por isto.
   */
  const notificarEmailEnviado = async (adminDb: any, aviso: AvisoEmail, b: any, quemUid: string | null, resultado?: unknown) => {
    const usuarios = await adminDb.collection("usuarios").get();
    const perfis: readonly string[] = PERFIS_AVISO_EMAIL;
    const destino = new Set<string>(usuarios.docs.filter((d: any) => d.data().ativo !== false && perfis.includes(String(d.data().perfil))).map((d: any) => d.id));
    let ator = "";
    if (quemUid) {
      destino.delete(quemUid);
      const d = usuarios.docs.find((x: any) => x.id === quemUid)?.data();
      ator = String(d?.usuario || d?.nome || "Usuário");
    }
    if (!destino.size) return;
    let rota = "/inspecoes";
    let numeroIs = "";
    let concurso = "";
    if (aviso.alvo === "is") {
      const isId = String(b?.isId ?? "").trim();
      if (isId && !isId.includes("/")) {
        const i = await adminDb.collection("inspecoes").doc(isId).get();
        numeroIs = String(i.data()?.is || isId);
        if (i.exists) rota = `/inspecoes/${encodeURIComponent(isId)}`;
      }
    } else if (aviso.alvo === "concurso") {
      const concursoId = String(b?.concursoId ?? "").trim();
      if (concursoId && !concursoId.includes("/")) {
        const c = await adminDb.collection("concursos").doc(concursoId).get();
        concurso = String(c.data()?.nome || concursoId);
        rota = `/concursos/${encodeURIComponent(concursoId)}`;
      }
    }
    const enviados = Number((resultado as { enviados?: unknown } | undefined)?.enviados);
    const qtd = Number.isFinite(enviados) && enviados > 0 ? enviados : Array.isArray(b?.isIds) ? b.isIds.length : 0;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b?.data || ""));
    const corpo = textoAvisoEmail(aviso.texto, { ator, is: numeroIs, concurso, qtd: qtd ? quantidadeIS(qtd) : "", data: m ? `${m[3]}/${m[2]}/${m[1]}` : "" });
    await enviarPush(adminDb, { uids: destino }, { titulo: aviso.titulo, corpo: corpo.replace(" ()", ""), rota });
  };

  // Matriz de permissões salva pelo Admin (config/permissoes), somada aos padrões de config/permissoesPadrao.
  const lerMatrizPermissoes = async (adminDb: any): Promise<MatrizPermissoesArmazenada | null> =>
    ((await adminDb.collection("config").doc("permissoes").get()).data() as MatrizPermissoesArmazenada | undefined) || null;

  /** Usuários ativos cujo perfil pode executar a ação — só eles são notificados dela. */
  const uidsQuePodemExecutar = async (
    adminDb: any, req: { pagina: string; feature?: FeatureKey; soAdmin?: boolean },
    recebe: (u: { uid: string; perfil?: string }) => boolean = () => true,
  ): Promise<Set<string>> => {
    const [snap, matriz] = await Promise.all([adminDb.collection("usuarios").get(), lerMatrizPermissoes(adminDb)]);
    return new Set(snap.docs.filter((d: any) => d.data().ativo !== false && perfilExecuta(matriz, d.data().perfil, req)
      && recebe({ uid: d.id, perfil: d.data().perfil })).map((d: any) => d.id));
  };

  /** Usuário da equipe com a função da matriz (Admin sempre). Responde 401/403 e devolve false quando não pode. */
  const exigirFuncao = async (req: express.Request, res: express.Response, rota: string, feature: FeatureKey): Promise<boolean> => {
    const quem = await exigirUsuario(req, res, rota, PERFIS_EQUIPE);
    if (!quem) return false;
    const { adminDb } = await getFirebaseAdmin();
    if (featurePermitida(await lerMatrizPermissoes(adminDb), feature, quem.perfil)) return true;
    void auditarServidor("acesso_negado", rota, quem.uid, "sem_funcao");
    res.status(403).json({ success: false, error: "Seu perfil não tem permissão para esta operação." });
    return false;
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
        void auditarServidor("acesso_negado", "notificacoes-evento", decoded.uid, "usuario_inativo");
        res.status(403).json({ success: false, error: "Usuário inativo." });
        return;
      }
      const nomeAtor = String(ator.usuario || ator.nome || "Usuário");
      const tipo = String(req.body?.tipo || "");

      // O aviso "{{usuario}} logado." ao Admin foi descontinuado: versões antigas do app
      // em cache ainda podem mandar o evento — é aceito e ignorado.
      if (tipo === "login") { res.json({ success: true, enviado: false }); return; }

      // Ações do app (catálogo em config/notificacoesAcoes.ts). O texto vem do
      // catálogo, nunca do navegador; só quem pode executar a ação é avisado.
      if (tipo === "acao") {
        const acaoId = String(req.body?.acao || "");
        const acao: AcaoNotificavel | null = acaoNotificavel(acaoId);
        const alvoId = String(req.body?.alvoId || "").slice(0, 120);
        if (!acao || alvoId.includes("/") || (acao.alvo !== "nenhum" && !alvoId)) {
          res.status(400).json({ success: false, error: "Evento inválido." });
          return;
        }
        const matriz = await lerMatrizPermissoes(adminDb);
        // Quem não pode executar a ação não dispara aviso (a gravação em si já
        // é barrada pelas regras do Firestore): ignora sem erro.
        if (!perfilExecuta(matriz, ator.perfil, acao)) { res.json({ success: true, enviado: false }); return; }
        // E-mails: o próprio servidor avisa ao enviar (notificarEmailEnviado); o pedido do app antigo é ignorado.
        if (acao.peloServidor) { res.json({ success: true, enviado: false }); return; }
        // Anti-repetição por usuário + ação + alvo.
        const chave = `acao_${decoded.uid}_${acaoId}_${alvoId || "-"}`.replace(/[^\w.-]/g, "_").slice(0, 400);
        const ref = adminDb.collection("notificacoes_enviadas").doc(chave);
        const ultimo = (await ref.get()).data()?.em?.toDate?.() as Date | undefined;
        if (ultimo && Date.now() - ultimo.getTime() < (acao.intervaloMs ?? INTERVALO_PADRAO_ACAO_MS)) { res.json({ success: true, enviado: false }); return; }
        await ref.set({ em: new Date() });

        let rota = ROTA_DA_PAGINA[acao.pagina] || "/";
        let nomeConcurso = "";
        let numeroIs = "";
        let peritoUidDaIS = "";
        if (acao.alvo === "concurso") {
          const c = await adminDb.collection("concursos").doc(alvoId).get();
          nomeConcurso = String(c.data()?.nome || alvoId);
          rota = `/concursos/${encodeURIComponent(alvoId)}`;
        } else if (acao.alvo === "is") {
          const i = await adminDb.collection("inspecoes").doc(alvoId).get();
          numeroIs = String(i.data()?.is || alvoId);
          peritoUidDaIS = String(i.data()?.peritoUid || "");
          rota = i.exists ? `/inspecoes/${encodeURIComponent(alvoId)}` : "/inspecoes";
        }
        const corpo = acao.texto.replace("{ator}", nomeAtor).replace("{concurso}", nomeConcurso).replace("{is}", numeroIs);
        const destino = await uidsQuePodemExecutar(adminDb, acao, u => recebeAvisoDaAcao(u, acao, peritoUidDaIS));
        destino.delete(decoded.uid);
        if (destino.size) await enviarPush(adminDb, { uids: destino }, { titulo: acao.titulo, corpo, rota });
        res.json({ success: true, enviado: destino.size > 0 });
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
        // Quem pode lançar status/finalizar IS na planilha, menos quem realizou o evento.
        const todos = await uidsQuePodemExecutar(adminDb, { pagina: "concursosJRS", feature: "concursosJRS.editarDadosTabela" });
        todos.delete(decoded.uid);
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
      logErroSeguro("Notificação push error", error);
      res.status(500).json({ success: false, error: "Não foi possível enviar a notificação." });
    }
  });

  // Repasse de arquivos do Firebase Storage (POST /api/arquivos/baixar { caminho }). Em redes que
  // bloqueiam ou interceptam firebasestorage.googleapis.com (ex.: Firefox nos PCs da Marinha), os PDFs
  // e as fotos chegam pelo próprio servidor do app, que já é acessível. Exige usuário ativo e só serve
  // as pastas de PASTAS_ARQUIVOS (espelho de storage.rules). Devolve os bytes com o Content-Type do
  // arquivo; o cliente monta um blob: (services/arquivosStorage.ts).
  // PDFs da IS que só a equipe lê (guias e exames — caminhoArquivoEquipe) também passam aqui, com o perfil conferido.
  app.post("/api/arquivos/baixar", async (req, res) => {
    const caminho = req.body?.caminho;
    const daEquipe = caminhoArquivoEquipe(caminho);
    const quem = await exigirUsuario(req, res, "arquivos-baixar", daEquipe ? PERFIS_EQUIPE : undefined);
    if (!quem) return;
    const uid = quem.uid;
    if (!daEquipe && !caminhoArquivoValido(caminho)) {
      void auditarServidor("acesso_negado", "arquivos-baixar", uid, "caminho_invalido");
      res.status(400).json({ success: false, error: "Arquivo inválido." });
      return;
    }
    try {
      const { adminApp } = await getFirebaseAdmin();
      const { getStorage } = await import("firebase-admin/storage");
      const arquivo = getStorage(adminApp).bucket(BUCKET_STORAGE).file(caminho);
      const [meta] = await arquivo.getMetadata();
      res.setHeader("Content-Type", String(meta.contentType || "application/octet-stream"));
      if (meta.size) res.setHeader("Content-Length", String(meta.size));
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("X-Content-Type-Options", "nosniff");
      arquivo.createReadStream()
        .on("error", (e: unknown) => { logErroSeguro("Storage stream", e); if (!res.headersSent) res.status(500).end(); else res.destroy(); })
        .pipe(res);
    } catch (error: any) {
      const naoExiste = error?.code === 404 || /No such object/i.test(String(error?.message));
      if (!naoExiste) logErroSeguro("Storage repasse", error);
      res.status(naoExiste ? 404 : 500).json({ success: false, error: naoExiste ? "Arquivo não encontrado." : "Falha ao ler o arquivo." });
    }
  });

  // Documentos oficiais em HTML + CSS → PDF (Chromium), no lugar dos templates do Google Docs no Apps
  // Script (servidor/documentos/). Devolvem { success, pdfBase64 }, o mesmo formato das ações antigas.
  //  - termo-recurso: Termo de Reconhecimento de Recurso; com incluirCientificacao (padrão), a 2ª página
  //    é o Termo de Cientificação com "Inapto" marcado — o PDF único que o app guarda para o inapto;
  //  - termo-cientificacao: Termo de Cientificação de Resultado (APTO | INAPTO | INSUF DOCUMENTAL).
  const texto = (v: unknown, max = 300): string => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  // Texto livre de várias linhas (histórico, exames): mantém as quebras, apara cada linha e limita o tamanho.
  const textoLongo = (v: unknown, max = 8000): string => String(v ?? "").replace(/\r\n?/g, "\n").split("\n")
    .map(l => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
  const assinatura = (b: any) => ({ nomeUsuario: texto(b.nomeUsuario), postoGraduacao: texto(b.postoGraduacao), cargo: texto(b.cargo), crmPe: texto(b.crmPe, 40) });
  const responderPdf = async (res: express.Response, rota: string, gerarHtml: () => Promise<string | import("./servidor/documentos/paginado").DocumentoPaginado>) => {
    try {
      const { htmlParaPdf } = await import("./servidor/documentos/gerarPdf");
      const pdf = await htmlParaPdf(await gerarHtml());
      res.json({ success: true, pdfBase64: pdf.toString("base64") });
    } catch (error) {
      logErroSeguro(`Documento ${rota}`, error);
      res.status(500).json({ success: false, error: "Não foi possível gerar o documento. Tente novamente." });
    }
  };

  app.post("/api/documentos/termo-recurso", async (req, res) => {
    if (!(await exigirUsuario(req, res, "documentos-termo-recurso", PERFIS_EQUIPE))) return;
    const b = req.body || {};
    const dados = {
      candidatoId: texto(b.candidatoId, 40), candidatoNome: texto(b.candidatoNome), nomeConcurso: texto(b.nomeConcurso),
      dataLaudo: texto(b.dataLaudo, 40), nomeUsuario: texto(b.nomeUsuario), postoGraduacao: texto(b.postoGraduacao), cargo: texto(b.cargo),
    };
    if (!dados.candidatoId || !dados.candidatoNome) {
      res.status(400).json({ success: false, error: "Informe a matrícula e o nome do candidato." });
      return;
    }
    await responderPdf(res, "termo-recurso", async () => {
      const t = await import("./servidor/documentos/termosConcurso");
      return b.incluirCientificacao === false ? t.htmlTermoRecurso(dados) : t.htmlTermoRecursoComCientificacao(dados);
    });
  });

  app.post("/api/documentos/termo-cientificacao", async (req, res) => {
    if (!(await exigirUsuario(req, res, "documentos-termo-cientificacao", PERFIS_EQUIPE))) return;
    const b = req.body || {};
    const status = texto(b.status, 20).toUpperCase();
    const dados = { candidatoId: texto(b.candidatoId, 40), candidatoNome: texto(b.candidatoNome), nomeConcurso: texto(b.nomeConcurso) };
    if (!dados.candidatoId || !dados.candidatoNome) {
      res.status(400).json({ success: false, error: "Informe a matrícula e o nome do candidato." });
      return;
    }
    if (status !== "APTO" && status !== "INAPTO" && status !== "INSUF DOCUMENTAL") {
      res.status(400).json({ success: false, error: "Status deve ser APTO, INAPTO ou INSUF DOCUMENTAL." });
      return;
    }
    await responderPdf(res, "termo-cientificacao", async () =>
      (await import("./servidor/documentos/termosConcurso")).htmlTermoCientificacao({ ...dados, status }));
  });

  // Solicitações da planilha do concurso (parecer e exames) e Pedido de Parecer da página Pareceres.
  app.post("/api/documentos/solicitacao-parecer", async (req, res) => {
    if (!(await exigirUsuario(req, res, "documentos-solicitacao-parecer", PERFIS_EQUIPE))) return;
    const b = req.body || {};
    const dados = {
      candidatoId: texto(b.candidatoId, 40), candidatoNome: texto(b.candidatoNome), nomeConcurso: texto(b.nomeConcurso),
      especialidade: texto(b.especialidade, 120), historico: textoLongo(b.historico), ...assinatura(b),
    };
    if (!dados.candidatoId || !dados.candidatoNome || !dados.especialidade || !dados.historico) {
      res.status(400).json({ success: false, error: "Informe candidato, especialidade e histórico." });
      return;
    }
    await responderPdf(res, "solicitacao-parecer", async () => (await import("./servidor/documentos/solicitacoesConcurso")).docSolicitacaoParecer(dados));
  });

  app.post("/api/documentos/solicitacao-exames", async (req, res) => {
    if (!(await exigirUsuario(req, res, "documentos-solicitacao-exames", PERFIS_EQUIPE))) return;
    const b = req.body || {};
    const dados = {
      candidatoId: texto(b.candidatoId, 40), candidatoNome: texto(b.candidatoNome), nomeConcurso: texto(b.nomeConcurso),
      exames: textoLongo(b.exames, 4000), ...assinatura(b),
    };
    if (!dados.candidatoId || !dados.candidatoNome || !dados.exames) {
      res.status(400).json({ success: false, error: "Informe o candidato e os exames." });
      return;
    }
    await responderPdf(res, "solicitacao-exames", async () => (await import("./servidor/documentos/solicitacoesConcurso")).docSolicitacaoExames(dados));
  });

  app.post("/api/documentos/pedido-parecer", async (req, res) => {
    if (!(await exigirUsuario(req, res, "documentos-pedido-parecer", PERFIS_MEDICOS))) return;
    const b = req.body || {};
    const quesitos = (Array.isArray(b.quesitos) ? b.quesitos : []).map((q: unknown) => textoLongo(q, 2000)).filter(Boolean).slice(0, 60);
    const dados = {
      inspecionado: texto(b.inspecionado), especialidade: texto(b.especialidade, 120), finalidade: texto(b.finalidade),
      historico: textoLongo(b.historico), quesitos, ...assinatura(b),
    };
    if (!dados.inspecionado || !dados.especialidade || !dados.finalidade || !dados.historico) {
      res.status(400).json({ success: false, error: "Informe inspecionado, especialidade, finalidade e histórico." });
      return;
    }
    if (!quesitos.length) {
      res.status(400).json({ success: false, error: "Informe ao menos um quesito." });
      return;
    }
    await responderPdf(res, "pedido-parecer", async () => (await import("./servidor/documentos/pedidoParecer")).docPedidoParecer(dados));
  });

  // Pedido de Parecer gerado E guardado pelo servidor (Ficha › Pareceres, página Pareceres e Inspeções de Saúde), sem
  // o Apps Script: PDF no Storage em pareceres/{id}.pdf; a assinatura (perito da IS ou quem gera) é lida do Firestore
  // (servidor/documentos/pedidoParecerServico.ts). Devolve { id, caminho, pdfUrl, assinante }; o app grava o pedido.
  app.post("/api/pareceres/pedido", async (req, res) => {
    const quem = await exigirUsuario(req, res, "pareceres-pedido", PERFIS_MEDICOS);
    if (!quem) return;
    const b = req.body || {};
    const quesitos = (Array.isArray(b.quesitos) ? b.quesitos : []).map((q: unknown) => textoLongo(q, 2000)).filter(Boolean).slice(0, 60);
    const corpo = {
      inspecionado: texto(b.inspecionado), especialidade: texto(b.especialidade, 120), finalidade: texto(b.finalidade),
      historico: textoLongo(b.historico), quesitos, isId: texto(b.isId, 20),
    };
    if (!corpo.inspecionado || !corpo.especialidade || !corpo.finalidade || !corpo.historico) {
      res.status(400).json({ success: false, error: "Informe inspecionado, especialidade, finalidade e histórico." });
      return;
    }
    if (!quesitos.length) {
      res.status(400).json({ success: false, error: "Informe ao menos um quesito." });
      return;
    }
    const { ErroPedidoParecer, gerarPedidoParecer } = await import("./servidor/documentos/pedidoParecerServico");
    try {
      const { adminDb, adminApp } = await getFirebaseAdmin();
      const { getStorage } = await import("firebase-admin/storage");
      const r = await gerarPedidoParecer(adminDb, getStorage(adminApp).bucket(BUCKET_STORAGE), BUCKET_STORAGE, quem.uid, corpo);
      res.json({ success: true, ...r });
    } catch (error: any) {
      if (error instanceof ErroPedidoParecer) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      logErroSeguro("Pedido de parecer", error);
      res.status(500).json({ success: false, error: "Não foi possível gerar o pedido de parecer. Tente novamente." });
    }
  });

  // Documentos gerados a partir de uma IS ("Gerar Documento ▾" da Ficha): um gerador por tipo em servidor/documentos/is/
  // (registro.ts). Corpo { isId, tipo, dados, enviarEmail?, teste? }; perfis por tipo em utils/documentosIS.ts (conferidos
  // no serviço). PDF permanente em inspecoes/{isId}/documentos/ + registro em inspecoes/{isId}/documentos/{id}.
  app.post("/api/inspecoes/documentos/gerar", async (req, res) => {
    const quem = await exigirUsuario(req, res, "inspecoes-documentos-gerar", PERFIS_EQUIPE);
    if (!quem) return;
    const { ErroDocumentoIS } = await import("./servidor/documentos/is/tipos");
    try {
      const { adminDb, adminApp } = await getFirebaseAdmin();
      const { getStorage } = await import("firebase-admin/storage");
      const { gerarDocumentoIS } = await import("./servidor/documentos/is/servico");
      const r = await gerarDocumentoIS(adminDb, getStorage(adminApp).bucket(BUCKET_STORAGE), BUCKET_STORAGE, quem, req.body || {});
      res.json({ success: true, ...r });
    } catch (error: any) {
      if (error instanceof ErroDocumentoIS) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      logErroSeguro("Documento da IS", error);
      res.status(500).json({ success: false, error: "Não foi possível gerar o documento. Tente novamente." });
    }
  });

  // [rotas: guias de exames — pacote A] (gerar PDF, apagar ao excluir a IS, limpeza 15 dias após a finalização)
  // Guias de exames da IS (servidor/documentos/guiasExames/): PDF único no Storage (inspecoes/{isId}/guias/) e
  // resumo em inspecoes/{isId}.guiasExames. Gerar: equipe; apagar (ao excluir a IS): só Admin.
  const rotaGuias = (rota: string, perfis: string[], acao: (db: import("firebase-admin/firestore").Firestore, bucket: import("./servidor/documentos/guiasExames/servico").Bucket, b: any, uid: string) => Promise<object>) =>
    async (req: express.Request, res: express.Response) => {
      const quem = await exigirUsuario(req, res, rota, perfis);
      if (!quem) return;
      const { ErroGuias } = await import("./servidor/documentos/guiasExames/servico");
      try {
        const { adminDb, adminApp } = await getFirebaseAdmin();
        const { getStorage } = await import("firebase-admin/storage");
        res.json({ success: true, ...(await acao(adminDb, getStorage(adminApp).bucket(BUCKET_STORAGE), req.body || {}, quem.uid)) });
      } catch (error: any) {
        if (error instanceof ErroGuias) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        logErroSeguro(`Guias ${rota}`, error);
        res.status(500).json({ success: false, error: "Não foi possível processar as guias de exames. Tente novamente." });
      }
    };
  app.post("/api/documentos/guias-exames", rotaGuias("documentos-guias-exames", PERFIS_EQUIPE, async (db, bucket, b, uid) =>
    (await import("./servidor/documentos/guiasExames/servico")).gerarGuiasExames(db, bucket, uid, b)));
  // Apagar as guias (ao excluir a IS): função inspecoes.excluir da matriz (padrão: Admin e Secretaria).
  app.post("/api/documentos/guias-exames/apagar", async (req, res, next) => {
    if (await exigirFuncao(req, res, "documentos-guias-exames-apagar", "inspecoes.excluir")) next();
  }, rotaGuias("documentos-guias-exames-apagar", PERFIS_EQUIPE, async (db, bucket, b) =>
    (await import("./servidor/documentos/guiasExames/servico")).apagarGuiasExames(db, bucket, b.isId)));

  // Exclusão COMPLETA da IS (servidor/inspecoes/excluir.ts): a IS e tudo o que é dela — subcoleções, mensagens,
  // horários, PDFs no Storage, pedidos de parecer vinculados e o evento do Google Agenda. Função inspecoes.excluir
  // (IS não finalizada; o Admin apaga qualquer uma), conferida pela matriz de permissões como nas notificações.
  // Exclusão de uma perícia menor: Admin (qualquer uma) ou o perito responsável / quem registrou, com Justificativa
  // (≥ 10 caracteres) fora do Admin; guarda o registro em periciasExcluidas e apaga o PDF (servidor/pericias/excluir.ts).
  // Edição de uma perícia menor: mesmas regras da exclusão (Admin ou o perito; Justificativa fora do Admin).
  app.post("/api/pericias-menores/editar", async (req, res) => {
    const quem = await exigirUsuario(req, res, "pericias-editar", ["admin", "user_medicos", "user_medicos_mpi", "user_medicos_geral"]);
    if (!quem) return;
    const { ErroExclusaoPericia, editarPericiaMenor } = await import("./servidor/pericias/excluir");
    try {
      const { adminDb } = await getFirebaseAdmin();
      const r = await editarPericiaMenor(adminDb, req.body?.id, req.body?.campos, req.body?.justificativa, quem);
      void auditarServidor("operacao_sensivel", "pericias-editar", quem.uid);
      res.json({ success: true, ...r });
    } catch (error: any) {
      if (error instanceof ErroExclusaoPericia) {
        if (error.status === 403) void auditarServidor("acesso_negado", "pericias-editar", quem.uid, "nao_e_o_perito");
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      logErroSeguro("Edição da perícia menor", error);
      res.status(500).json({ success: false, error: "Não foi possível salvar as alterações. Tente novamente." });
    }
  });

  // Feedback do app (Ajuda › Feedback): qualquer usuário ativo envia; só o Admin marca Lido/Solucionado.
  app.post("/api/feedback", async (req, res) => {
    const quem = await exigirUsuario(req, res, "feedback-enviar");
    if (!quem) return;
    const { ErroFeedback, criarFeedback } = await import("./servidor/feedback/feedback");
    try {
      const { adminDb } = await getFirebaseAdmin();
      res.json({ success: true, ...(await criarFeedback(adminDb, req.body || {}, quem)) });
    } catch (error: any) {
      if (error instanceof ErroFeedback) { res.status(error.status).json({ success: false, error: error.message }); return; }
      logErroSeguro("Envio de feedback", error);
      res.status(500).json({ success: false, error: "Não foi possível enviar o feedback. Tente novamente." });
    }
  });

  app.post("/api/feedback/status", async (req, res) => {
    const quem = await exigirUsuario(req, res, "feedback-status", ["admin"]);
    if (!quem) return;
    const { ErroFeedback, atualizarFeedback } = await import("./servidor/feedback/feedback");
    try {
      const { adminDb } = await getFirebaseAdmin();
      res.json({ success: true, ...(await atualizarFeedback(adminDb, req.body || {}, quem)) });
    } catch (error: any) {
      if (error instanceof ErroFeedback) { res.status(error.status).json({ success: false, error: error.message }); return; }
      const { ErroContaGoogle } = await import("./servidor/google/contaGoogle");
      if (error instanceof ErroContaGoogle && error.codigo !== "falha") {
        res.status(503).json({ success: false, codigo: "google_indisponivel", error: "Marcado como solucionado, mas o e-mail não foi enviado: a conta Google da JRS não está autorizada." });
        return;
      }
      logErroSeguro("Status do feedback", error);
      res.status(500).json({ success: false, error: "Não foi possível atualizar o feedback. Tente novamente." });
    }
  });

  app.post("/api/pericias-menores/excluir", async (req, res) => {
    const quem = await exigirUsuario(req, res, "pericias-excluir", ["admin", "user_medicos", "user_medicos_mpi", "user_medicos_geral"]);
    if (!quem) return;
    const { ErroExclusaoPericia, excluirPericiaMenor } = await import("./servidor/pericias/excluir");
    try {
      const { adminDb, adminApp } = await getFirebaseAdmin();
      const { getStorage } = await import("firebase-admin/storage");
      const r = await excluirPericiaMenor(adminDb, getStorage(adminApp).bucket(BUCKET_STORAGE), req.body?.id, req.body?.justificativa, quem);
      void auditarServidor("operacao_sensivel", "pericias-excluir", quem.uid);
      res.json({ success: true, ...r });
    } catch (error: any) {
      if (error instanceof ErroExclusaoPericia) {
        if (error.status === 403) void auditarServidor("acesso_negado", "pericias-excluir", quem.uid, "nao_e_o_perito");
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      logErroSeguro("Exclusão da perícia menor", error);
      res.status(500).json({ success: false, error: "Não foi possível excluir a perícia. Tente novamente." });
    }
  });

  app.post("/api/inspecoes/excluir", async (req, res) => {
    const quem = await exigirUsuario(req, res, "inspecoes-excluir", PERFIS_EQUIPE);
    if (!quem) return;
    const { ErroExclusaoIS, excluirInspecao } = await import("./servidor/inspecoes/excluir");
    try {
      const { adminDb, adminApp } = await getFirebaseAdmin();
      const { getStorage } = await import("firebase-admin/storage");
      const temFuncao = featurePermitida(await lerMatrizPermissoes(adminDb), "inspecoes.excluir", quem.perfil);
      const r = await excluirInspecao(adminDb, getStorage(adminApp).bucket(BUCKET_STORAGE), req.body?.isId, { perfil: quem.perfil, temFuncao },
        async eventoId => { await (await import("./servidor/google/agenda")).sincronizarEventoIS(adminDb, { eventoId, remover: true }); });
      void auditarServidor("operacao_sensivel", "inspecoes-excluir", quem.uid);
      res.json({ success: true, ...r });
    } catch (error: any) {
      if (error instanceof ErroExclusaoIS) {
        if (error.status === 403) void auditarServidor("acesso_negado", "inspecoes-excluir", quem.uid, "sem_funcao");
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      logErroSeguro("Exclusão da IS", error);
      res.status(500).json({ success: false, error: "Não foi possível excluir a IS. Tente novamente." });
    }
  });

  // ---- Conta Google da JRS no servidor (e-mail de impressão e Google Agenda, no lugar do Apps Script) ----
  // Sem a conta autorizada (ou sem o cliente OAuth configurado), as rotas respondem 503 com
  // codigo "google_indisponivel" e o app usa o Apps Script, como antes (services/googleServidor.ts).
  const urlServidor = (req: express.Request) => `https://${req.get("host")}`;
  const rotaGoogle = (rota: string, perfis: string[], acao: (db: import("firebase-admin/firestore").Firestore, b: any, quem: { uid: string; perfil: string }) => Promise<unknown>, sensivel = false) =>
    async (req: express.Request, res: express.Response) => {
      const quem = await exigirUsuario(req, res, rota, perfis);
      if (!quem) return;
      try {
        const { adminDb } = await getFirebaseAdmin();
        const r = await acao(adminDb, req.body || {}, quem);
        // E-mails de impressão: operação sensível (como ACOES_SENSIVEIS no Apps Script).
        if (sensivel) void auditarServidor("operacao_sensivel", rota, quem.uid);
        // E-mail enviado: aviso aos Admin e à Secretaria, menos quem enviou (config/notificacoesEmails.ts).
        const aviso = AVISOS_EMAIL[rota];
        if (aviso) void notificarEmailEnviado(adminDb, aviso, req.body || {}, quem.uid, r).catch(e => logErroSeguro(`Aviso ${rota}`, e));
        res.json({ success: true, ...(r && typeof r === "object" ? r : {}) });
      } catch (error: any) {
        const { ErroContaGoogle } = await import("./servidor/google/contaGoogle");
        if (error instanceof ErroContaGoogle && error.codigo !== "falha") {
          res.status(503).json({ success: false, codigo: "google_indisponivel", error: error.message });
          return;
        }
        logErroSeguro(`Google ${rota}`, error);
        res.status(error instanceof ErroContaGoogle ? 400 : 500).json({ success: false, error: error?.message || "Falha na operação com o Google." });
      }
    };

  app.post("/api/google/situacao", rotaGoogle("google-situacao", ["admin"], async db =>
    (await import("./servidor/google/contaGoogle")).situacaoConta(db)));
  app.post("/api/google/autorizacao", async (req, res) => {
    const quem = await exigirUsuario(req, res, "google-autorizacao", ["admin"]);
    if (!quem) return;
    try {
      const { adminDb } = await getFirebaseAdmin();
      const { iniciarAutorizacao } = await import("./servidor/google/contaGoogle");
      res.json({ success: true, url: await iniciarAutorizacao(adminDb, quem.uid, urlServidor(req)) });
    } catch (error: any) {
      res.status(503).json({ success: false, error: error?.message || "Cliente OAuth não configurado." });
    }
  });
  // Retorno do Google depois do "Permitir" (navegação direta, sem token do app: o "state" de uso único vale como prova).
  app.get("/api/google/retorno", async (req, res) => {
    const pagina = (titulo: string, texto: string) => `<!doctype html><meta charset="utf-8"><title>${titulo}</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px;color:#050F41"><h1 style="font-size:22px">${titulo}</h1><p>${texto}</p><p>Pode fechar esta aba e voltar ao app.</p></body>`;
    const esc = (t: string) => t.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    try {
      if (req.query.error) throw new Error(`O Google recusou: ${String(req.query.error)}`);
      const { adminDb } = await getFirebaseAdmin();
      const { concluirAutorizacao } = await import("./servidor/google/contaGoogle");
      const conta = await concluirAutorizacao(adminDb, String(req.query.code || ""), String(req.query.state || ""), urlServidor(req));
      void auditarServidor("operacao_sensivel", "google-autorizacao", "", "conta_autorizada");
      res.type("html").send(pagina("Conta Google autorizada", `O servidor do app passa a enviar os e-mails de impressão e a sincronizar o Google Agenda como <b>${esc(conta || "a conta autorizada")}</b>.`));
    } catch (error: any) {
      res.status(400).type("html").send(pagina("Autorização não concluída", esc(error?.message || "Tente de novo pelo app.")));
    }
  });

  app.post("/api/impressao/parecer", rotaGoogle("impressao-parecer", PERFIS_MEDICOS, async (db, b, quem) => {
    await (await import("./servidor/google/impressao")).enviarParecerImpressao(db, String(b.pdfUrl || ""), b.remetente, quem.uid);
    return { enviado: true };
  }, true));
  app.post("/api/impressao/termo-recurso", rotaGoogle("impressao-termo-recurso", PERFIS_EQUIPE, async (db, b) => {
    await (await import("./servidor/google/impressao")).enviarTermoRecursoImpressao(db, b);
    return { enviado: true };
  }, true));
  app.post("/api/impressao/solicitacao-concurso", rotaGoogle("impressao-solicitacao", PERFIS_EQUIPE, async (db, b) => {
    await (await import("./servidor/google/impressao")).enviarSolicitacaoConcursoImpressao(db, b);
    return { enviado: true };
  }, true));
  // Resultado da IS ao inspecionado (só IS com TIS assinado; Admin e Secretaria): servidor/email/resultadoIS.ts.
  app.post("/api/email/resultado-is", rotaGoogle("email-resultado-is", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/resultadoIS")).enviarResultadoIS(db, b.isId, b.email, quem.uid)) }), true));
  // [rotas: e-mails de guias e de abertura — pacote B1]
  // Guias de exames (PDF do Storage em anexo) ao inspecionado e/ou à SEC-JRS (Admin e Secretaria): servidor/email/guiasIS.ts.
  app.post("/api/email/guias-is", rotaGoogle("email-guias-is", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/guiasIS")).enviarGuiasIS(db, await bucketStorage(), b, quem.uid)) }), true));
  // Ficha › Exames / Atestados e Laudos, "Zimbra SEC-JRS": o PDF do documento da IS aos membros da SEC-JRS
  // escolhidos, para impressão (equipe; no app, a função "ficha.zimbraSecretaria"): servidor/email/documentoIS.ts.
  app.post("/api/email/documento-is", rotaGoogle("email-documento-is", PERFIS_EQUIPE, async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/documentoIS")).enviarDocumentoSecretaria(db, await bucketStorage(), b, quem.uid)) }), true));
  // Abertura da IS ao inspecionado (prazos e consequências; Admin e Secretaria): servidor/email/aberturaIS.ts.
  app.post("/api/email/abertura-is", rotaGoogle("email-abertura-is", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/aberturaIS")).enviarAberturaIS(db, b.isId, b.email, quem.uid)) }), true));
  // Membros da SEC-JRS (user_secretaria ativos com institucional) para as caixas do dialog das guias; rótulo = usuario.
  app.post("/api/secretaria/usuarios", async (req, res) => {
    if (!(await exigirUsuario(req, res, "secretaria-usuarios", PERFIS_EQUIPE))) return;
    try {
      const { adminDb } = await getFirebaseAdmin();
      res.json({ success: true, usuarios: await (await import("./servidor/email/guiasIS")).listarUsuariosSecretaria(adminDb) });
    } catch (error: any) {
      logErroSeguro("secretaria-usuarios", error);
      res.status(500).json({ success: false, error: "Falha ao listar a Secretaria." });
    }
  });

  // E-mail de agendamento/reagendamento ao inspecionado (todos os grupos: Verificações, Benefícios e geral; Admin e Secretaria): servidor/email/agendamentoIS.ts.
  app.post("/api/email/agendamento-is", rotaGoogle("email-agendamento-is", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/agendamentoIS")).enviarAgendamentoIS(db, b.isId, b.email, quem.uid)) }), true));
  // E-mail de faltas às IS dos inspecionados do HNRe (Admin e Secretaria): servidor/email/faltasHNRe.ts.
  app.post("/api/email/faltas-hnre", rotaGoogle("email-faltas-hnre", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/faltasHNRe")).enviarFaltasHNRe(db, b.isIds, quem.uid)) }), true));
  // E-mail de candidatos inaptos de concurso à EAMPE (Admin e Secretaria): servidor/email/inaptosConcurso.ts.
  app.post("/api/email/inaptos-concurso", rotaGoogle("email-inaptos-concurso", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/inaptosConcurso")).enviarInaptosConcurso(db, b.concursoId, b.candidatoIds, quem.uid)) }), true));
  // E-mail ao NAC: IS finalizadas de Verificações e Términos (Admin e Secretaria): servidor/email/nac.ts.
  app.post("/api/email/nac", rotaGoogle("email-nac", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/nac")).enviarNac(db, b.isIds, quem.uid)) }), true));
  // [rotas: e-mails de agendamento geral/benefícios e resultado de benefícios — pacote B2]
  // Resultado de IS de Benefícios (3 modelos; IS com Nº do TIS; Admin e Secretaria): servidor/email/resultadoBeneficios.ts.
  app.post("/api/email/resultado-beneficios", rotaGoogle("email-resultado-beneficios", ["admin", "user_secretaria"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/resultadoBeneficios")).enviarResultadoBeneficios(db, b.isId, b.modelo, b.email, quem.uid)) }), true));

  // E-mails de teste (Configurações; só Admin): dados fictícios, só para os destinatários de teste: servidor/email/teste.ts.
  app.post("/api/email/teste", rotaGoogle("email-teste", ["admin"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/teste")).enviarEmailTeste(db, b.tipo, quem.uid)) })));
  // E-mail "IS AGENDADAS EM dd/mm/aaaa" (servidor/email/agendaIS.ts). Manual: só o Admin escolhe o dia.
  const bucketStorage = async () => {
    const { adminApp } = await getFirebaseAdmin();
    const { getStorage } = await import("firebase-admin/storage");
    return getStorage(adminApp).bucket(BUCKET_STORAGE);
  };
  app.post("/api/email/agenda-is", rotaGoogle("email-agenda-is", ["admin"], async (db, b, quem) =>
    ({ enviado: true, ...(await (await import("./servidor/email/agendaIS")).enviarAgendaIS(db, await bucketStorage(), String(b.data || ""), { uid: quem.uid, automatico: false })) }), true));
  // Automático: o Cloud Scheduler chama às 18h (Recife) de domingo a quinta, com o cabeçalho X-Agendador-Token
  // = AGENDADOR_TOKEN (scripts/agendador/configurar-email-agenda.sh). Sem token configurado, a rota fica desligada.
  app.post("/api/agendador/agenda-is", async (req, res) => {
    const esperado = process.env.AGENDADOR_TOKEN || "";
    const recebido = String(req.get("X-Agendador-Token") || "");
    const { timingSafeEqual } = await import("node:crypto");
    const ok = esperado.length >= 32 && recebido.length === esperado.length && timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
    if (!ok) {
      void auditarServidor("acesso_negado", "agendador-agenda-is", "", esperado ? "token_invalido" : "agendador_desligado");
      res.status(esperado ? 401 : 503).json({ success: false, error: "Agendador não autorizado." });
      return;
    }
    // Pacote A: apaga as guias de exames das IS finalizadas há mais de 15 dias (best effort: nunca derruba o e-mail).
    try {
      const { adminDb } = await getFirebaseAdmin();
      await (await import("./servidor/documentos/guiasExames/servico")).limparGuiasVencidas(adminDb, await bucketStorage());
    } catch (error) {
      logErroSeguro("Agendador limpeza de guias", error);
    }
    // PDFs de teste dos documentos da IS com mais de 30 min (também limpos a cada geração de teste).
    try {
      await (await import("./servidor/documentos/is/servico")).limparTestesDocumentosIS(await bucketStorage());
    } catch (error) {
      logErroSeguro("Agendador limpeza de testes de documentos", error);
    }
    // Apaga os PDFs de exames dos candidatos 1 ano depois da última data de agendamento do concurso
    // (sem ela, do encerramento); as transcrições ficam (docs/retencao-lgpd.md). Best effort.
    try {
      const { adminDb } = await getFirebaseAdmin();
      await (await import("./servidor/concursos/retencaoExames")).limparPdfsExamesVencidos(adminDb, await bucketStorage());
    } catch (error) {
      logErroSeguro("Agendador retenção de exames", error);
    }
    try {
      const { adminDb } = await getFirebaseAdmin();
      const r = await (await import("./servidor/email/agendaIS")).envioAutomaticoAgendaIS(adminDb, await bucketStorage());
      if (r.enviado) {
        void auditarServidor("operacao_sensivel", "agendador-agenda-is", "agendador");
        void notificarEmailEnviado(adminDb, AVISO_EMAIL_AGENDA_AUTOMATICO, { data: r.data }, null).catch(e => logErroSeguro("Aviso agendador agenda-is", e));
      }
      res.json({ success: true, ...r });
    } catch (error: any) {
      logErroSeguro("Agendador agenda-is", error);
      // 500: o Cloud Scheduler tenta de novo (o envio de uma data só sai uma vez).
      res.status(500).json({ success: false, error: error?.message || "Falha no envio automático." });
    }
  });
  // Aniversariantes do dia: o Cloud Scheduler chama às 07h (Recife), todo dia, com o mesmo X-Agendador-Token
  // (scripts/agendador/configurar-aniversariantes.sh). Havendo aniversariante (usuários ativos com dataNascimento),
  // todos os usuários ativos recebem o push; uma vez por data (notificacoes_enviadas).
  app.post("/api/agendador/aniversariantes", async (req, res) => {
    const esperado = process.env.AGENDADOR_TOKEN || "";
    const recebido = String(req.get("X-Agendador-Token") || "");
    const { timingSafeEqual } = await import("node:crypto");
    const ok = esperado.length >= 32 && recebido.length === esperado.length && timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
    if (!ok) {
      void auditarServidor("acesso_negado", "agendador-aniversariantes", "", esperado ? "token_invalido" : "agendador_desligado");
      res.status(esperado ? 401 : 503).json({ success: false, error: "Agendador não autorizado." });
      return;
    }
    try {
      const { adminDb } = await getFirebaseAdmin();
      // Retenção dos anexos do Chat (7 dias; docs/retencao-lgpd.md): este job roda todo dia às 07h.
      await (await import("./servidor/chat/retencaoAnexos")).limparAnexosChatVencidos(adminDb, await bucketStorage())
        .catch(e => logErroSeguro("Retenção anexos chat", e));
      const { aniversariantesDoMes, hojeEmRecife, nomeSemPosto } = await import("./utils/aniversarios");
      const hoje = hojeEmRecife();
      const snap = await adminDb.collection("usuarios").get();
      const usuarios = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const doDia = aniversariantesDoMes(usuarios, hoje).filter(a => a.ehHoje);
      if (!doDia.length) { res.json({ success: true, aniversariantes: 0 }); return; }
      if (!(await marcarEnvio(adminDb, `aniversariantes_${hoje}`))) { res.json({ success: true, jaEnviado: true }); return; }
      const nomes = doDia.map(a => `${a.pessoa.usuario}`);
      const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}` : nomes[0];
      const todos = new Set<string>(usuarios.filter((u: any) => u.ativo !== false).map((u: any) => u.id));
      const r = await enviarPush(adminDb, { uids: todos }, {
        titulo: doDia.length > 1 ? "Aniversariantes do dia" : "Aniversariante do dia",
        corpo: `Hoje é aniversário ${doDia.length > 1 ? "de" : "do(a)"} ${lista}. Deixe seus parabéns! 🎂`,
        rota: "/",
      });
      void auditarServidor("operacao_sensivel", "agendador-aniversariantes", "agendador", doDia.map(a => nomeSemPosto(a.pessoa.usuario)).join(", "));
      res.json({ success: true, aniversariantes: doDia.length, ...r, erros: r.erros.length });
    } catch (error: any) {
      logErroSeguro("Agendador aniversariantes", error);
      res.status(500).json({ success: false, error: "Falha no aviso de aniversariantes." });
    }
  });
  // ---- Chat entre usuários (components/Chat.tsx, services/chat.ts, utils/chat.ts) ----
  // Retenção dos anexos (7 dias) em rota própria, com o mesmo X-Agendador-Token (também roda no job das 07h acima).
  app.post("/api/agendador/chat-anexos", async (req, res) => {
    const esperado = process.env.AGENDADOR_TOKEN || "";
    const recebido = String(req.get("X-Agendador-Token") || "");
    const { timingSafeEqual } = await import("node:crypto");
    const ok = esperado.length >= 32 && recebido.length === esperado.length && timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
    if (!ok) {
      void auditarServidor("acesso_negado", "agendador-chat-anexos", "", esperado ? "token_invalido" : "agendador_desligado");
      res.status(esperado ? 401 : 503).json({ success: false, error: "Agendador não autorizado." });
      return;
    }
    try {
      const { adminDb } = await getFirebaseAdmin();
      const r = await (await import("./servidor/chat/retencaoAnexos")).limparAnexosChatVencidos(adminDb, await bucketStorage());
      void auditarServidor("operacao_sensivel", "agendador-chat-anexos", "agendador", String(r.apagados));
      res.json({ success: true, ...r });
    } catch (error: any) {
      logErroSeguro("Agendador chat-anexos", error);
      res.status(500).json({ success: false, error: "Falha na limpeza dos anexos do chat." });
    }
  });
  // Push da nova mensagem ao destinatário. O app só informa conversa e mensagem; aqui se confere que quem
  // chama é o autor e participante, que o perfil dele pode enviar (e anexar, se houver anexo) e que o do
  // destinatário pode receber (config/chat). O texto do push vem de utils/chat.ts (textoAviso), uma vez por mensagem.
  app.post("/api/chat/notificar", async (req, res) => {
    const quem = await exigirUsuario(req, res, "chat-notificar");
    if (!quem) return;
    const conversaId = String(req.body?.conversaId || "");
    const mensagemId = String(req.body?.mensagemId || "");
    if (!/^[\w-]{1,128}_[\w-]{1,128}$/.test(conversaId) || !/^[\w-]{1,64}$/.test(mensagemId)) {
      res.status(400).json({ success: false, error: "Pedido inválido." });
      return;
    }
    try {
      const { adminDb } = await getFirebaseAdmin();
      const { participantesDe, permissaoChat, textoAviso, tipoMensagem } = await import("./utils/chat");
      const participantes = participantesDe(conversaId);
      const destinatario = participantes.find(p => p !== quem.uid) || "";
      const msg = (await adminDb.collection("conversas").doc(conversaId).collection("mensagens").doc(mensagemId).get()).data();
      if (!participantes.includes(quem.uid) || !destinatario || !msg || msg.autor !== quem.uid) {
        void auditarServidor("acesso_negado", "chat-notificar", quem.uid, "nao_participante");
        res.status(403).json({ success: false, error: "Sem acesso a esta conversa." });
        return;
      }
      const matriz = (await adminDb.collection("config").doc("chat").get()).data()?.perfis || null;
      const dest = (await adminDb.collection("usuarios").doc(destinatario).get()).data();
      const pRem = permissaoChat(matriz, quem.perfil);
      if (!pRem.enviar || (msg.anexo && !pRem.anexos)) {
        void auditarServidor("acesso_negado", "chat-notificar", quem.uid, "sem_funcao");
        res.status(403).json({ success: false, error: "Seu perfil não pode enviar no chat." });
        return;
      }
      if (!dest || dest.ativo === false || !permissaoChat(matriz, dest.perfil).receber) { res.json({ success: true, enviado: false }); return; }
      if (!(await marcarEnvio(adminDb, `chat_${conversaId}_${mensagemId}`))) { res.json({ success: true, enviado: false }); return; }
      const remetente = (await adminDb.collection("usuarios").doc(quem.uid).get()).data();
      const corpo = textoAviso(String(remetente?.usuario || remetente?.nome || "Usuário"), tipoMensagem(msg.anexo?.tipo));
      await enviarPush(adminDb, { uids: new Set([destinatario]) }, { titulo: "Chat", corpo, rota: `/chat/${encodeURIComponent(conversaId)}` });
      res.json({ success: true, enviado: true });
    } catch (error) {
      logErroSeguro("Chat notificar", error);
      res.status(500).json({ success: false, error: "Falha ao avisar o destinatário." });
    }
  });
  app.post("/api/agenda/evento-is", rotaGoogle("agenda-evento-is", PERFIS_EQUIPE, async (db, b) =>
    (await import("./servidor/google/agenda")).sincronizarEventoIS(db, b)));
  app.post("/api/agenda/evento-bloqueio", rotaGoogle("agenda-evento-bloqueio", PERFIS_EQUIPE, async (db, b) =>
    (await import("./servidor/google/agenda")).sincronizarEventoBloqueio(db, b)));
  app.post("/api/agenda/concursos", rotaGoogle("agenda-concursos", PERFIS_EQUIPE, async (db, b) =>
    (await import("./servidor/google/agenda")).sincronizarEventosConcursos(db, b)));

  // ---- Entrevista da IS gravada no celular (servidor/entrevistas/; contrato em config/entrevistas.ts) ----
  // Áudio → ffmpeg (FLAC) → Speech-to-Text V2 (Chirp 3, pt-BR, falantes) → Gemini no Vertex AI (anamnese)
  // → Firestore inspecoes/{isId}/entrevistas/{entrevistaId}. Só Admin e user_medicos. Logs sem conteúdo.
  const rotaEntrevista = (rota: string, acao: (ctx: { req: express.Request; res: express.Response; uid: string; db: import("firebase-admin/firestore").Firestore; bucket: import("./servidor/entrevistas/fluxo").Bucket }) => Promise<void>) =>
    async (req: express.Request, res: express.Response) => {
      // A rota /audio autentica ANTES de ler o corpo binário (res.locals.quemEntrevista).
      const quem = res.locals.quemEntrevista || await exigirUsuario(req, res, rota, [...PERFIS_ENTREVISTA]);
      if (!quem) return;
      try {
        const { adminDb, adminApp } = await getFirebaseAdmin();
        const { getStorage } = await import("firebase-admin/storage");
        await acao({ req, res, uid: quem.uid, db: adminDb, bucket: getStorage(adminApp).bucket(BUCKET_STORAGE) });
      } catch (error: any) {
        const { ErroEntrevista } = await import("./servidor/entrevistas/fluxo");
        if (error instanceof ErroEntrevista) {
          if (!res.headersSent) res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        logErroSeguro(`Entrevista ${rota}`, error);
        if (!res.headersSent) res.status(500).json({ success: false, error: "Falha ao processar a entrevista. Tente novamente." });
        else res.destroy();
      }
    };
  const idsEntrevista = (b: any) => ({ isId: String(b?.isId ?? ""), entrevistaId: String(b?.entrevistaId ?? "") });

  // Reserva do upload (quando o envio direto ao Storage falha): corpo binário audio/*.
  const lerAudioBruto = express.raw({ type: "audio/*", limit: "80mb" });
  app.post("/api/entrevistas/audio", async (req, res, next) => {
    const quem = await exigirUsuario(req, res, "entrevista-audio", [...PERFIS_ENTREVISTA]);
    if (!quem) return;
    res.locals.quemEntrevista = quem;
    lerAudioBruto(req, res, (erro?: any) => {
      if (!erro) { next(); return; }
      const grande = erro?.type === "entity.too.large" || erro?.status === 413;
      res.status(grande ? 413 : 400).json({ success: false, error: grande ? "O áudio é grande demais." : "Falha ao receber o áudio." });
    });
  }, rotaEntrevista("entrevista-audio", async ({ req, res, db, bucket }) => {
    const { salvarAudioReserva } = await import("./servidor/entrevistas/fluxo");
    const caminho = await salvarAudioReserva(db, bucket, String(req.get("X-Is-Id") || ""), String(req.get("X-Entrevista-Id") || ""), req.body, req.get("Content-Type"));
    res.json({ success: true, caminho });
  }));
  app.post("/api/entrevistas/processar", rotaEntrevista("entrevista-processar", async ({ req, res, uid, db, bucket }) => {
    const { processarEntrevista } = await import("./servidor/entrevistas/fluxo");
    const b = req.body || {};
    void auditarServidor("operacao_sensivel", "entrevista-processar", uid);
    const situacao = await processarEntrevista(db, bucket, { ...idsEntrevista(b), caminho: b.caminho, mimeType: b.mimeType, duracaoSeg: b.duracaoSeg });
    res.json({ success: true, situacao });
  }));
  app.post("/api/entrevistas/situacao", rotaEntrevista("entrevista-situacao", async ({ req, res, db }) => {
    const { avancarEntrevista } = await import("./servidor/entrevistas/fluxo");
    const { isId, entrevistaId } = idsEntrevista(req.body);
    res.json({ success: true, situacao: await avancarEntrevista(db, isId, entrevistaId) });
  }));
  app.post("/api/entrevistas/reorganizar", rotaEntrevista("entrevista-reorganizar", async ({ req, res, uid, db }) => {
    const { reorganizarEntrevista } = await import("./servidor/entrevistas/fluxo");
    const { isId, entrevistaId } = idsEntrevista(req.body);
    void auditarServidor("operacao_sensivel", "entrevista-reorganizar", uid);
    res.json({ success: true, situacao: await reorganizarEntrevista(db, isId, entrevistaId) });
  }));
  app.post("/api/entrevistas/ouvir", rotaEntrevista("entrevista-ouvir", async ({ req, res, uid, db, bucket }) => {
    const { localizarAudioOriginal } = await import("./servidor/entrevistas/fluxo");
    const { isId, entrevistaId } = idsEntrevista(req.body);
    const { arquivo, contentType, tamanho } = await localizarAudioOriginal(db, bucket, isId, entrevistaId);
    void auditarServidor("operacao_sensivel", "entrevista-ouvir", uid);
    res.setHeader("Content-Type", contentType);
    if (tamanho) res.setHeader("Content-Length", String(tamanho));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    arquivo.createReadStream()
      .on("error", (e: unknown) => { logErroSeguro("Entrevista ouvir stream", e); if (!res.headersSent) res.status(500).end(); else res.destroy(); })
      .pipe(res);
  }));

  // "Enviar para o meu celular" (computador sem microfone): push SÓ para os aparelhos do próprio
  // usuário, menos o que pediu (o computador, se tiver notificações). Tocar abre o app instalado
  // em #/inspecoes/{isId}/entrevista e o fluxo de gravação abre sozinho (SecaoEntrevista).
  app.post("/api/entrevistas/enviar-para-celular", rotaEntrevista("entrevista-enviar-celular", async ({ req, res, uid, db }) => {
    const { ErroEntrevista } = await import("./servidor/entrevistas/fluxo");
    const { idValido } = await import("./servidor/entrevistas/audio");
    const isId = String(req.body?.isId ?? "");
    if (!idValido(isId)) throw new ErroEntrevista(400, "IS inválida.");
    const isSnap = await db.collection("inspecoes").doc(isId).get();
    if (!isSnap.exists) throw new ErroEntrevista(404, "IS não encontrada.");
    const atual = typeof req.body?.aparelhoAtual === "string" && req.body.aparelhoAtual.length < 4096 ? req.body.aparelhoAtual : "";
    const semCelular = "Nenhum celular com notificações ativadas. Ative as notificações no app do celular.";
    const meus = await db.collection("tokens_push").where("uid", "==", uid).get();
    if (!meus.docs.some(d => d.id !== atual)) throw new ErroEntrevista(409, semCelular);
    const is = isSnap.data() || {};
    // Só posto/quadro e nome: o NIP não vai para a tela de bloqueio.
    const nome = String(is.inspecionado || "").replace(/\b\d[\d.\-]{4,}\b/g, " ").replace(/\s+/g, " ").trim();
    void auditarServidor("operacao_sensivel", "entrevista-enviar-celular", uid);
    const { enviados } = await enviarPush(db, { uids: new Set([uid]), excluirToken: atual }, {
      titulo: `Gravar entrevista — IS ${is.is ?? isId}`,
      corpo: nome.slice(0, 80) || "Toque para gravar.",
      rota: `/inspecoes/${encodeURIComponent(isId)}/entrevista`,
    });
    if (!enviados) throw new ErroEntrevista(409, semCelular);
    res.json({ success: true, enviados });
  }));

  app.post("/api/gemini/analyze-image", async (req, res) => {
    try {
      if (!(await exigirUsuarioAtivo(req, res, "gemini-analyze-image"))) return;
      const { image, prompt } = req.body; // image as base64 string
      // Minimização (LGPD): só imagem válida e texto livre higienizado/truncado vão ao Gemini.
      if (!base64ValidoParaIA(image)) {
        res.status(400).json({ success: false, error: "Imagem inválida ou grande demais." });
        return;
      }
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
        text: higienizarParaIA(prompt) || "Extraia informações relevantes dessa imagem",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts: [imagePart, textPart] },
      });

      res.json({ success: true, text: response.text });
    } catch (error: any) {
      logErroSeguro("Gemini API error", error);
      res.status(500).json({ success: false, error: descreverErro(error).mensagem || "Falha ao analisar a imagem." });
    }
  });

  // Transcrição literal do PDF da mensagem administrativa (SIGAD-MB) do menu
  // Concursos, usada no lugar do OCR do Google Drive (Apps Script). O texto
  // devolvido é interpretado no cliente pelos mesmos regex já validados de
  // CodeConcursos.gs (ver utils/concursosUtils.ts) — este endpoint só
  // transcreve, nunca interpreta ou resume o conteúdo.
  app.post("/api/concursos/ocr-pdf", async (req, res) => {
    try {
      if (!(await exigirUsuarioAtivo(req, res, "concursos-ocr-pdf"))) return;
      const { fileBase64, mimeType } = req.body;
      if (!base64ValidoParaIA(fileBase64)) {
        res.status(400).json({ success: false, error: "Arquivo inválido ou grande demais." });
        return;
      }
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
      logErroSeguro("Gemini OCR error", error);
      res.status(500).json({ success: false, error: descreverErro(error).mensagem || "Falha ao ler o documento." });
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
        void auditarServidor("acesso_negado", "preview-apresentacao", decoded.uid, "nao_admin");
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
      logErroSeguro("Preview apresentacao error", error);
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

  // PDFs de teste dos documentos da IS: garante a exclusão em ~30 min mesmo sem o agendador (a cada 5 min).
  setInterval(() => {
    void (async () => (await import("./servidor/documentos/is/servico")).limparTestesDocumentosIS(await bucketStorage()))()
      .catch(error => logErroSeguro("Limpeza de testes de documentos", error));
  }, 5 * 60_000).unref();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
