// Ficheiro: services/auditoriaAcoes.ts
// Auditoria geral de ESCRITA em operações sensíveis (exclusão de cadastros/IS, geração de documentos),
// complementar a services/auditoriaIS.ts (que cobre as IS de concurso). Grava
//   auditoria_acoes/{autoId} { acao, alvo, uid, usuario, em }
// Só metadados: `alvo` é um rótulo fixo (ex.: "militares", tipo do documento), NUNCA nome, NIP, CID,
// URL ou conteúdo. Não há auditoria de leitura. "Best effort": falha aqui nunca impede a ação.
// Leitura restrita ao Admin; registros imutáveis (ver firestore.rules).
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { obterAtorAuditoria } from './auditoriaIS';
import { logErroSeguro } from '../utils/logSeguro';
import { registrarUsoAcao, TIPO_DA_ACAO_SENSIVEL } from './usoDiario';

const db = getFirestore(app);

export type AcaoSensivel = 'militar.excluir' | 'militar.importarCsv' | 'inspecao.excluir' | 'documento.gerar' | 'config.alterar' | 'afastamento.criar' | 'afastamento.alterar' | 'afastamento.apagar'
  // Administração (auditoria v3, 8b — Registro de alterações): alvo = uid do usuário (nunca nome/NIP) ou o
  // documento de configuração ('permissoes', 'emails', 'agendaIS'); `detalhe` = o que mudou, em texto curto e
  // sem dados pessoais (ex.: "User Médicos · Inspeções de Saúde › Cadastrar nova IS: desligado").
  | 'permissoes.alterar' | 'usuario.criar' | 'usuario.editar' | 'usuario.perfil' | 'usuario.ativacao' | 'usuario.excluir' | 'usuario.senha';

const MAX_DETALHES = 30;

export const registrarAcaoSensivel = async (acao: AcaoSensivel, alvo: string, detalhe?: string[]): Promise<void> => {
  const ator = obterAtorAuditoria();
  if (!ator) return;
  // Contagem agregada do uso do app (uso_diario; só o tipo da ação).
  registrarUsoAcao(TIPO_DA_ACAO_SENSIVEL[acao]);
  try {
    await addDoc(collection(db, 'auditoria_acoes'), {
      acao, alvo: String(alvo).slice(0, 60), uid: ator.uid, usuario: ator.usuario, em: serverTimestamp(),
      ...(detalhe && detalhe.length ? { detalhe: detalhe.slice(0, MAX_DETALHES).map(d => String(d).slice(0, 160)) } : {}),
    });
  } catch (e) {
    logErroSeguro('Falha ao registrar ação sensível', e);
  }
};

// ---------------------------------------------------------------- Leitura (só Admin — firestore.rules)

export interface RegistroAcao {
  id: string;
  acao: string;
  alvo: string;
  /** uid de quem fez. */
  uid: string;
  /** Login de quem fez. */
  usuario: string;
  em: Date | null;
  detalhe: string[];
}

const paraRegistro = (id: string, d: Record<string, unknown>): RegistroAcao => ({
  id,
  acao: String(d.acao || ''),
  alvo: String(d.alvo || ''),
  uid: String(d.uid || ''),
  usuario: String(d.usuario || ''),
  em: d.em instanceof Timestamp ? d.em.toDate() : null,
  detalhe: Array.isArray(d.detalhe) ? d.detalhe.map(String) : [],
});

/** Registros mais recentes (Administração › Registro de alterações). Índice de campo único em "em". */
export const listarAcoesRecentes = async (max = 200): Promise<RegistroAcao[]> => {
  const snap = await getDocs(query(collection(db, 'auditoria_acoes'), orderBy('em', 'desc'), limit(max)));
  return snap.docs.map(d => paraRegistro(d.id, d.data()));
};

/** Registros de um campo igual a um valor (uid = feitos pelo usuário; alvo = feitos nele), ordenados no cliente (sem índice composto). */
export const listarAcoesPor = async (campo: 'uid' | 'alvo', valor: string, max = 100): Promise<RegistroAcao[]> => {
  const snap = await getDocs(query(collection(db, 'auditoria_acoes'), where(campo, '==', valor), limit(max)));
  return snap.docs.map(d => paraRegistro(d.id, d.data())).sort((a, b) => (b.em?.getTime() ?? 0) - (a.em?.getTime() ?? 0));
};
