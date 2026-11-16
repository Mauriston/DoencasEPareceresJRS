// Ficheiro: utils/examesFicha.ts
// Regras puras (sem Firebase) das abas Exames e Atestados e Laudos da Ficha do inspecionado
// (components/ficha/exames/):
//  - "Criar novo": a aba só entra no estado de envio com ?criar=<aba>&is=<isId> (botão "Enviar PDF" da aba IS) e
//    uma IS NÃO finalizada do inspecionado (isParaCriar); senão mostra o registro mais recente ou o aviso;
//  - os arquivos aceitos no campo de upload (clicar, arrastar ou colar): só PDFs (pdfsDaLista);
//  - os exames mínimos da finalidade da IS que a IA tenta enquadrar (examesMinimosDaIS) e as instruções extras da
//    leitura (instrucoesEnvioFicha — a chamada à IA é a mesma de services/examesIS.ts);
//  - o texto copiável da transcrição, no padrão dos concursos (utils/examesCandidato.ts → textoCopiaExame):
//    "# NOME DO EXAME", o laudo (ou um "Analito: valor" por linha nos laboratoriais) e o emissor com a data;
//  - assunto e anexo do e-mail "Zimbra SEC-JRS" (servidor/email/documentoIS.ts).
// Testadas em utils/__tests__/examesFicha.test.ts.
import { examesDasGuias, idadeEm, type SexoGuia } from './guiasExames';
import { textoCopiaExame, type ExameCandidato } from './examesCandidato';
import type { ClasseExame, ItemExame } from './examesIS';

/** Abas da Ficha que recebem PDFs ("Criar novo") e a classe gravada em cada uma. */
export type AbaDocumentoFicha = 'exames' | 'atestados';
export const CLASSE_DA_ABA: Record<AbaDocumentoFicha, ClasseExame> = { exames: 'laudo_exame', atestados: 'atestado_relatorio' };
export const ehAbaDocumento = (v: unknown): v is AbaDocumentoFicha => v === 'exames' || v === 'atestados';

/**
 * IS do inspecionado em que a aba recebe PDFs: só quando ?criar= é a própria aba, ?is= é uma IS da lista
 * (as do inspecionado) e ela não está finalizada (firestore.rules/storage.rules recusam o envio depois). Sem
 * permissão de envio, nunca.
 */
export const isParaCriar = <I extends { id: string; situacao?: string | null; status?: string | null }>(
  p: { aba: string | null | undefined; criar: string | null | undefined; is: string | null | undefined; podeEnviar: boolean },
  inspecoes: ReadonlyArray<I>,
): I | null => {
  if (!p.podeEnviar || !ehAbaDocumento(p.aba) || p.criar !== p.aba || !p.is) return null;
  const is = inspecoes.find(i => i.id === p.is);
  if (!is || is.situacao === 'finalizada' || is.status === 'cancelada') return null;
  return is;
};

/** PDFs de uma lista de arquivos (input, arrastar ou colar): pelo tipo ou, sem tipo, pela extensão. */
export const pdfsDaLista = <F extends { name: string; type: string }>(arquivos: ArrayLike<F> | null | undefined): { pdfs: F[]; ignorados: F[] } => {
  const lista = Array.from(arquivos ?? []);
  const ehPdf = (f: F) => f.type === 'application/pdf' || ((!f.type || f.type === 'application/octet-stream') && /\.pdf$/i.test(f.name));
  return { pdfs: lista.filter(ehPdf), ignorados: lista.filter(f => !ehPdf(f)) };
};

const sexoGuia = (s: unknown): SexoGuia | null => (/^f/i.test(String(s ?? '').trim()) ? 'Feminino' : /^m/i.test(String(s ?? '').trim()) ? 'Masculino' : null);

/**
 * Exames mínimos da finalidade da IS, para a IA enquadrar cada documento: os das guias já geradas (o que foi
 * pedido ao inspecionado) ou, sem guias, os do Anexo O pela finalidade, sexo e idade do cadastro (sem sexo ou
 * sem nascimento: a união dos dois sexos, sem limite de idade). Finalidade sem exames mínimos → [].
 */
export const examesMinimosDaIS = (
  is: { finalidade?: string | null; guiasExames?: { grupos?: { exames?: string[] }[] } | null },
  cadastro?: { sexo?: string | null; dataNascimento?: string | null } | null,
  hoje?: string,
): string[] => {
  const dasGuias = (is.guiasExames?.grupos ?? []).flatMap(g => g.exames ?? []).filter(Boolean);
  const unicos = (l: string[]) => Array.from(new Set(l));
  if (dasGuias.length) return unicos(dasGuias);
  const finalidade = String(is.finalidade ?? '').trim();
  if (!finalidade) return [];
  const sexo = sexoGuia(cadastro?.sexo);
  const idade = cadastro?.dataNascimento ? idadeEm(cadastro.dataNascimento, hoje) : NaN;
  const nomes = (s: SexoGuia, i: number) => examesDasGuias(finalidade, s, i).flatMap(g => g.exames);
  if (sexo && Number.isFinite(idade)) return unicos(nomes(sexo, idade));
  return unicos(sexo ? nomes(sexo, 200) : [...nomes('Masculino', 200), ...nomes('Feminino', 200)]);
};

/** Opções da leitura pela Ficha (services/examesIS.ts → lerExameComIA). */
export interface OpcoesLeituraExame {
  /** Exames mínimos da finalidade da IS (examesMinimosDaIS): a IA tenta enquadrar cada documento. */
  examesMinimos?: string[];
  /** Aba da Ficha onde o PDF foi enviado: a classificação gravada é a dela (origem 'aba'). */
  classeEsperada?: ClasseExame;
}

/** Instruções extras da leitura pela Ficha: a lista fechada de exames mínimos e a aba de destino. */
export const instrucoesEnvioFicha = (o: OpcoesLeituraExame): string => {
  const partes: string[] = [];
  if (o.examesMinimos?.length) {
    partes.push(
      'Exames mínimos pedidos para a finalidade desta Inspeção de Saúde (lista fechada):',
      ...o.examesMinimos.map(n => `- ${n}`),
      'Se um documento corresponder a um destes exames, devolva em "exameMinimo" o nome EXATO da lista. Se não corresponder',
      'a nenhum, omita "exameMinimo" e use em "titulo" o nome correto do exame, em maiúsculas (ex.: "TC DE TÓRAX",',
      '"ECOCARDIOGRAMA", "RM DO JOELHO DIREITO"). Nunca force um enquadramento que o documento não sustenta.',
    );
  }
  if (o.classeEsperada === 'atestado_relatorio') {
    partes.push('O PDF foi enviado como atestado, relatório ou laudo de médico assistente: em "tipo" prefira atestado, laudo_medico ou parecer, conforme o documento.');
  } else if (o.classeEsperada === 'laudo_exame') {
    partes.push('O PDF foi enviado como laudo de exame complementar.');
  }
  return partes.join('\n');
};

const dataBR = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso);

/** Nome do documento na Ficha: o exame mínimo enquadrado (quando há) ou o título lido. */
export const nomeDoItem = (item: Pick<ItemExame, 'titulo' | 'exameMinimo'>): string => item.exameMinimo || item.titulo;

/** O item da IS no formato dos exames dos concursos (para reutilizar textoCopiaExame e o bloco de analitos). */
export const exameCandidatoDoItem = (item: ItemExame, ordem = 1): ExameCandidato => ({
  ordem,
  categoria: item.valores?.length ? 'bioquimica' : 'outro',
  nome: nomeDoItem(item).toUpperCase(),
  paciente: '',
  emissor: item.emissor,
  conselho: '',
  data: dataBR(item.data),
  itens: item.valores ?? [],
  resultado: '',
  texto: item.texto,
});

/**
 * Texto copiável de um documento: "# NOME DO EXAME", o conteúdo e o emissor com a data. Laboratoriais com os
 * analitos lidos: um "Analito: valor" por linha (padrão dos concursos), também sob o título.
 */
export const textoTranscricaoItem = (item: ItemExame): string => {
  const e = exameCandidatoDoItem(item);
  const corpo = textoCopiaExame(e);
  return e.categoria === 'outro' ? corpo : [`# ${e.nome}`, corpo].join('\n\n');
};

/** Texto copiável do PDF inteiro (um ou mais documentos), separados como no "Copiar todos" dos concursos. */
export const textoTranscricao = (itens: ReadonlyArray<ItemExame>): string => itens.map(textoTranscricaoItem).join('\n\n\n');

// ---------------------------------------------------------------- E-mail "Zimbra SEC-JRS"

const ROTULO_EMAIL: Record<ClasseExame, string> = { laudo_exame: 'EXAME', atestado_relatorio: 'ATESTADO/LAUDO' };

/** "EXAME DE {inspecionado} - IMPRESSÃO" / "ATESTADO/LAUDO DE {inspecionado} - IMPRESSÃO". */
export const assuntoDocumentoSecretaria = (classe: ClasseExame, nomeInspecionado: string): string =>
  `${ROTULO_EMAIL[classe]} DE ${String(nomeInspecionado || '').trim()} - IMPRESSÃO`.replace(/\s{2,}/g, ' ').trim();

/** Nome do PDF anexado: "<título> - IS 1234567.pdf" (sem caracteres que atrapalham o nome do arquivo). */
export const nomeAnexoDocumento = (titulo: string, numeroIs: number | string): string => {
  const base = String(titulo || 'Documento').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Documento';
  return `${base} - IS ${String(numeroIs ?? '').trim()}.pdf`;
};

/** Escolha do dialog "Zimbra SEC-JRS": ao menos um membro marcado. */
export const erroEscolhaSecretaria = (uids: ReadonlyArray<string>): string =>
  uids.length ? '' : 'Escolha ao menos um membro da SEC-JRS.';
