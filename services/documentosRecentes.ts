// Ficheiro: services/documentosRecentes.ts
// "Últimos documentos gerados" da Página Inicial: junta os pareceres e as
// perícias menores mais recentes — pareceres vêm do Firestore (coleção "pareceres"),
// perícias menores do Firestore (coleção "periciasMenores") — só dos tipos a que o perfil tem acesso
// (a checagem de permissão é de quem chama).
import { extrairNomeInspecionado } from '../utils/format';
import { observarPareceres } from './firestorePareceres';
import { observarPericiasMenores, dataBR } from './firestorePericiasMenores';

export interface DocumentoRecente {
  tipo: 'parecer' | 'pericia-menor';
  /** Nome do inspecionado. */
  titulo: string;
  /** Especialidade (parecer) ou CID (perícia menor). */
  detalhe: string;
  /** DD/MM/AAAA. */
  data: string;
  ts: number;
  link: string;
}

/** Lê os pareceres mais recentes do Firestore (uma leitura única). */
const lerPareceres = (limite: number): Promise<DocumentoRecente[]> => new Promise(resolve => {
  const parar = observarPareceres(lista => {
    parar();
    resolve(lista.slice(0, limite).map((p): DocumentoRecente => ({
      tipo: 'parecer', titulo: extrairNomeInspecionado(p.inspecionado), detalhe: p.especialidade,
      data: p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? '', ts: p.criadoEm?.toMillis?.() ?? Date.now(), link: p.pdfUrl,
    })));
  }, () => { resolve([]); }, limite);
});

/** Lê as perícias menores mais recentes do Firestore (uma leitura única). */
const lerPericias = (limite: number): Promise<DocumentoRecente[]> => new Promise(resolve => {
  const parar = observarPericiasMenores(lista => {
    parar();
    resolve(lista.slice(0, limite).map((p): DocumentoRecente => {
      const [a, m, d] = p.dataAtestado.split('-').map(Number);
      return {
        tipo: 'pericia-menor', titulo: extrairNomeInspecionado(p.inspecionado), detalhe: p.cid,
        data: dataBR(p.dataAtestado), ts: a ? new Date(a, m - 1, d).getTime() : 0, link: p.pdfUrl,
      };
    }));
  }, () => { resolve([]); }, limite);
});

export const buscarDocumentosRecentes = async (tipos: { pareceres: boolean; periciaMenor: boolean }, limite = 6): Promise<DocumentoRecente[]> => {
  const [pareceres, pericias] = await Promise.all([
    tipos.pareceres ? lerPareceres(limite) : Promise.resolve([] as DocumentoRecente[]),
    tipos.periciaMenor ? lerPericias(limite) : Promise.resolve([] as DocumentoRecente[]),
  ]);
  return [...pareceres, ...pericias].sort((a, b) => b.ts - a.ts).slice(0, limite);
};
