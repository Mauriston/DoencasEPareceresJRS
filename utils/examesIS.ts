// Ficheiro: utils/examesIS.ts
// Exames da IS (PDFs enviados no detalhe da IS; services/examesIS.ts): tipos de documento e a limpeza do
// que a IA (Firebase AI Logic) leu de cada PDF. Via de regra um PDF por exame, mas um PDF pode trazer mais
// de um documento: cada um vira um item, com o texto do laudo na íntegra para copiar.
// Testadas em utils/__tests__/examesIS.test.ts.
import { dataCivilISO } from './dados';

export const TIPOS_DOCUMENTO = [
  'exame_imagem', 'exame_laboratorial', 'exame_funcional', 'laudo_medico', 'parecer', 'atestado', 'receita', 'outro',
] as const;
export type TipoDocumento = typeof TIPOS_DOCUMENTO[number];

export const ROTULO_TIPO: Record<TipoDocumento, string> = {
  exame_imagem: 'Exame de imagem',
  exame_laboratorial: 'Exame laboratorial',
  exame_funcional: 'Exame funcional',
  laudo_medico: 'Laudo/relatório médico',
  parecer: 'Parecer',
  atestado: 'Atestado',
  receita: 'Receita',
  outro: 'Outro documento',
};

export const ICONE_TIPO: Record<TipoDocumento, string> = {
  exame_imagem: 'image',
  exame_laboratorial: 'labs',
  exame_funcional: 'monitor_heart',
  laudo_medico: 'description',
  parecer: 'assignment',
  atestado: 'note_alt',
  receita: 'medication',
  outro: 'draft',
};

/** Um documento identificado no PDF. */
export interface ItemExame {
  tipo: TipoDocumento;
  /** Nome do exame/documento (ex.: "Ressonância magnética do joelho direito"). */
  titulo: string;
  /** Data de realização/emissão (AAAA-MM-DD) ou ''. */
  data: string;
  /** Serviço ou profissional que emitiu ('' se não constar). */
  emissor: string;
  /** Texto do laudo na íntegra (técnica, achados, conclusão/impressão). */
  texto: string;
}

/** O que a IA devolve (texto livre, ainda não conferido). */
export interface LeituraExameIA {
  documentos?: { tipo?: string; titulo?: string; data?: string; emissor?: string; texto?: string }[];
}

const limpo = (v: unknown): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : '');

/** Itens válidos da leitura: tipo conhecido (senão "outro"), data real e só documentos com título ou texto. */
export const itensDaLeitura = (l: LeituraExameIA): ItemExame[] => (l.documentos ?? [])
  .map(d => ({
    tipo: (TIPOS_DOCUMENTO as readonly string[]).includes(String(d?.tipo)) ? d!.tipo as TipoDocumento : 'outro',
    titulo: limpo(d?.titulo).replace(/\s+/g, ' '),
    data: dataCivilISO(limpo(d?.data)) || '',
    emissor: limpo(d?.emissor).replace(/\s+/g, ' '),
    texto: limpo(d?.texto),
  }))
  .filter(d => d.titulo || d.texto)
  .map(d => ({ ...d, titulo: d.titulo || ROTULO_TIPO[d.tipo] }));

/** Texto para a área de transferência: título, data e o laudo na íntegra. */
export const textoParaCopiar = (item: ItemExame): string => {
  const cabecalho = [item.titulo.toUpperCase(), item.data ? item.data.split('-').reverse().join('/') : ''].filter(Boolean).join(' — ');
  return [cabecalho, item.texto].filter(Boolean).join('\n');
};

/** Vários documentos (ex.: todos os exames da IS) separados por linha em branco. */
export const textosParaCopiar = (itens: ItemExame[]): string => itens.map(textoParaCopiar).join('\n\n');
