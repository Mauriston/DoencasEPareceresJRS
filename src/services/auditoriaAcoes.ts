// Ficheiro: services/auditoriaAcoes.ts
// Auditoria geral de ESCRITA em operações sensíveis (exclusão de cadastros/IS, geração de documentos),
// complementar a services/auditoriaIS.ts (que cobre as IS de concurso). Grava
//   auditoria_acoes/{autoId} { acao, alvo, uid, usuario, em }
// Só metadados: `alvo` é um rótulo fixo (ex.: "militares", tipo do documento), NUNCA nome, NIP, CID,
// URL ou conteúdo. Não há auditoria de leitura. "Best effort": falha aqui nunca impede a ação.
// Leitura restrita ao Admin; registros imutáveis (ver firestore.rules).
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { obterAtorAuditoria } from './auditoriaIS';
import { logErroSeguro } from '@/utils/logSeguro';

const db = getFirestore(app);

export type AcaoSensivel = 'militar.excluir' | 'inspecao.excluir' | 'documento.gerar';

export const registrarAcaoSensivel = async (acao: AcaoSensivel, alvo: string): Promise<void> => {
  const ator = obterAtorAuditoria();
  if (!ator) return;
  try {
    await addDoc(collection(db, 'auditoria_acoes'), {
      acao, alvo: String(alvo).slice(0, 60), uid: ator.uid, usuario: ator.usuario, em: serverTimestamp(),
    });
  } catch (e) {
    logErroSeguro('Falha ao registrar ação sensível', e);
  }
};
