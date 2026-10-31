// Ficheiro: services/notificacoesPush.ts
// Notificações push (Firebase Cloud Messaging). Cada aparelho que autoriza as
// notificações ganha um token do FCM, gravado em
//   tokens_push/{token}  { uid, usuario, plataforma, atualizadoEm }
// O backend (server.ts, /api/notificacoes/evento) lê essa coleção para enviar
// os avisos — o envio nunca parte do navegador. A autorização vale por
// aparelho/navegador: o convite (NotificacoesConvite em App.tsx) aparece em
// cada um até ser aceito ou bloqueado; "Agora não" adia por 7 dias.
//
// A chave pública VAPID vem de VITE_FIREBASE_VAPID_KEY (Console do Firebase >
// Configurações do projeto > Cloud Messaging > Certificados push da Web); sem
// ela as notificações ficam indisponíveis e nada é exibido.
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import {
  getFirestore, doc, setDoc, deleteDoc, updateDoc, writeBatch, collection, query, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { app, auth } from './firebaseAuth';
import { apiUrl } from '../utils/apiBase';
import { isIOS, isStandalone } from '../utils/pwa';

const db = getFirestore(app);
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const LS_ADIADO_ATE = 'jrs_push_adiado_ate';
const LS_TOKEN = 'jrs_push_token';
const DIAS_ADIAMENTO = 7;

export type EstadoNotificacoes =
  | 'indisponivel'   // navegador sem suporte (ou chave VAPID não configurada)
  | 'instalar-ios'   // iPhone/iPad fora da Tela de Início: precisa instalar o app antes
  | 'pendente'       // ainda não respondeu
  | 'ativadas'
  | 'bloqueadas';

export const estadoNotificacoes = async (): Promise<EstadoNotificacoes> => {
  if (!VAPID_KEY) return 'indisponivel';
  if (isIOS() && !isStandalone()) return 'instalar-ios';
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'indisponivel';
  if (!(await isSupported().catch(() => false))) return 'indisponivel';
  if (Notification.permission === 'granted') return 'ativadas';
  if (Notification.permission === 'denied') return 'bloqueadas';
  return 'pendente';
};

export const conviteAdiado = (): boolean => {
  try { return Number(localStorage.getItem(LS_ADIADO_ATE) || 0) > Date.now(); } catch { return false; }
};

export const adiarConvite = (): void => {
  try { localStorage.setItem(LS_ADIADO_ATE, String(Date.now() + DIAS_ADIAMENTO * 24 * 60 * 60 * 1000)); } catch { /* modo privado */ }
};

let registroSw: Promise<ServiceWorkerRegistration> | null = null;
const registrarServiceWorker = (): Promise<ServiceWorkerRegistration> => {
  if (!registroSw) {
    const q = new URLSearchParams({
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
    const base = import.meta.env.BASE_URL;
    registroSw = navigator.serviceWorker.register(`${base}firebase-messaging-sw.js?${q}`, { scope: base });
  }
  return registroSw;
};

let ouvindoPrimeiroPlano = false;

/**
 * Obtém o token deste aparelho e o vincula ao usuário logado. Só funciona com
 * a permissão já concedida — chamado ao abrir o app (renova o token) e logo
 * após o usuário autorizar.
 */
export const sincronizarAparelho = async (usuario: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || (await estadoNotificacoes()) !== 'ativadas') return;
  const registration = await registrarServiceWorker();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return;

  let anterior = '';
  try { anterior = localStorage.getItem(LS_TOKEN) || ''; } catch { /* modo privado */ }
  if (anterior && anterior !== token) deleteDoc(doc(db, 'tokens_push', anterior)).catch(() => {});
  await setDoc(doc(db, 'tokens_push', token), {
    uid: user.uid,
    usuario,
    plataforma: navigator.userAgent.slice(0, 200),
    atualizadoEm: serverTimestamp(),
  });
  try { localStorage.setItem(LS_TOKEN, token); } catch { /* modo privado */ }

  // Com o app aberto e em foco o FCM não exibe a notificação sozinho:
  // mostramos pelo próprio service worker, igual à de segundo plano.
  if (!ouvindoPrimeiroPlano) {
    ouvindoPrimeiroPlano = true;
    onMessage(messaging, payload => {
      const n = payload.notification;
      if (!n?.title) return;
      registration.showNotification(n.title, {
        body: n.body,
        icon: n.icon || `${import.meta.env.BASE_URL}icons/notificacao-192.png`,
        badge: `${import.meta.env.BASE_URL}icons/badge-96.png`,
        data: { link: payload.fcmOptions?.link },
      }).catch(() => {});
    });
  }
};

/** Pede a permissão do navegador (precisa vir de um clique) e vincula o aparelho. */
export const ativarNotificacoes = async (usuario: string): Promise<EstadoNotificacoes> => {
  const resposta = await Notification.requestPermission();
  if (resposta === 'granted') await sincronizarAparelho(usuario);
  return estadoNotificacoes();
};

/** No logout: este aparelho deixa de receber os avisos do usuário que saiu. */
export const desvincularAparelho = async (): Promise<void> => {
  let token = '';
  try { token = localStorage.getItem(LS_TOKEN) || ''; localStorage.removeItem(LS_TOKEN); } catch { /* modo privado */ }
  if (!token) return;
  await deleteDoc(doc(db, 'tokens_push', token)).catch(() => {});
  if (registroSw) await deleteToken(getMessaging(app)).catch(() => {});
};

export type EventoNotificacao =
  | { tipo: 'login' }
  | { tipo: 'teste' }
  | { tipo: 'status-alterado'; concursoId: string; candidatoId: string }
  | { tipo: 'is-finalizada'; concursoId: string; candidatoId: string };

/** Botão de teste do Perfil: o servidor manda um aviso só para os aparelhos do usuário. */
export const testarNotificacao = async (usuario: string): Promise<string> => {
  await sincronizarAparelho(usuario);
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const resp = await fetch(apiUrl('/api/notificacoes/evento'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ tipo: 'teste' }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.success) throw new Error(json.error || `Servidor respondeu ${resp.status}.`);
  if (!json.aparelhos) throw new Error('Nenhum aparelho seu cadastrado no servidor.');
  if (!json.enviados) throw new Error(`O envio falhou: ${(json.erros || []).join(' | ') || 'motivo desconhecido'}`);
  return `Enviada para ${json.enviados} de ${json.aparelhos} aparelho(s). Deve chegar em alguns segundos.`;
};

/**
 * Avisa o backend de um evento que pode gerar notificação. O servidor confere
 * no Firestore se o evento de fato ocorreu, monta o texto, escolhe os
 * destinatários e evita repetição — aqui é só o "toque". Best-effort: uma
 * falha nunca atrapalha a ação do usuário.
 */
export const notificarEvento = async (evento: EventoNotificacao): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch(apiUrl('/api/notificacoes/evento'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(evento),
    });
  } catch (e) {
    console.error('Falha ao enviar evento de notificação:', e);
  }
};

// ---------------------------------------------------------------------------
// Histórico (menu do avatar): o servidor grava cada notificação também em
//   usuarios/{uid}/notificacoes/{id}  { titulo, corpo, rota, lida, em }
// O badge do avatar conta as não lidas. Tocar no item do menu ou no push
// (o link traz ?notif=id) marca como lida.

export interface NotificacaoRecord {
  id: string;
  titulo: string;
  corpo: string;
  /** Rota do app (HashRouter) aberta ao tocar, ex.: /concursos/CPAEAM-2026. */
  rota: string;
  lida: boolean;
  em: Date | null;
}

const notificacoesCol = (uid: string) => collection(db, 'usuarios', uid, 'notificacoes');

export const observarNotificacoes = (
  uid: string,
  cb: (lista: NotificacaoRecord[]) => void,
): (() => void) =>
  onSnapshot(
    query(notificacoesCol(uid), orderBy('em', 'desc'), limit(100)),
    snap => cb(snap.docs.map(d => {
      const x = d.data();
      return {
        id: d.id,
        titulo: String(x.titulo || ''),
        corpo: String(x.corpo || ''),
        rota: String(x.rota || '/'),
        lida: x.lida === true,
        em: x.em instanceof Timestamp ? x.em.toDate() : null,
      };
    })),
    e => console.error('Falha ao ler notificações:', e),
  );

export const marcarNotificacaoLida = (uid: string, id: string) =>
  updateDoc(doc(db, 'usuarios', uid, 'notificacoes', id), { lida: true }).catch(e => console.error('Falha ao marcar notificação como lida:', e));

export const marcarTodasLidas = async (uid: string, ids: string[]): Promise<void> => {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach(id => batch.update(doc(db, 'usuarios', uid, 'notificacoes', id), { lida: true }));
    await batch.commit();
  }
};

/** Lê (e remove da barra de endereço) o ?notif=id de quem abriu o app pelo push. */
export const consumirNotifDaUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('notif');
  if (!id) return null;
  params.delete('notif');
  const resto = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${resto ? `?${resto}` : ''}${window.location.hash}`);
  return id;
};
