// Ficheiro: utils/examesIS.ts
// Exames da IS (PDFs enviados no detalhe da IS; services/examesIS.ts): tipos de documento e a limpeza do
// que a IA (Firebase AI Logic) leu de cada PDF. Via de regra um PDF por exame, mas um PDF pode trazer mais
// de um documento: cada um vira um item, com o texto do laudo na íntegra para copiar.
// Cada PDF também recebe uma classificação (laudo de exame × atestado/relatório médico), pedida à IA na
// mesma leitura; sem resposta válida da IA (ou nos PDFs antigos, sem o campo), ela vem dos tipos dos itens.
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
  /** Exame mínimo da finalidade da IS a que o documento corresponde (nome exato da lista; envio pela Ficha).
   *  Ausente quando não corresponde a nenhum ou o PDF foi enviado sem a lista. */
  exameMinimo?: string;
  /** Laboratoriais: um analito por linha ("Hemoglobina" · "15,4"), sem unidade — o padrão copiável dos concursos
   *  (utils/examesCandidato.ts). Ausente nos demais e nos PDFs enviados antes de 16/11/2026. */
  valores?: ValorExame[];
  /** Especialidade médica do documento, deduzida pela IA (ex.: "Ortopedia"). Ausente nos PDFs antigos. */
  especialidade?: string;
  /** Atestados e Laudos: atestado × laudo × relatório, pela IA. Ausente nos PDFs antigos (ver categoriaDoItem). */
  categoria?: CategoriaAtestado;
}

/** Categoria de um documento do médico assistente (aba Atestados e Laudos da Ficha). */
export const CATEGORIAS_ATESTADO = ['atestado', 'laudo', 'relatorio'] as const;
export type CategoriaAtestado = typeof CATEGORIAS_ATESTADO[number];
export const ROTULO_CATEGORIA: Record<CategoriaAtestado, string> = { atestado: 'Atestado', laudo: 'Laudo', relatorio: 'Relatório' };
export const ehCategoriaAtestado = (v: unknown): v is CategoriaAtestado => (CATEGORIAS_ATESTADO as readonly unknown[]).includes(v);

/** Categoria do item: a da IA ou, nos antigos, pelo tipo e pelo título. */
export const categoriaDoItem = (i: Pick<ItemExame, 'tipo' | 'titulo'> & { categoria?: unknown }): CategoriaAtestado => {
  if (ehCategoriaAtestado(i.categoria)) return i.categoria;
  if (i.tipo === 'atestado') return 'atestado';
  if (i.tipo === 'parecer' || /relat[oó]rio/i.test(i.titulo || '')) return 'relatorio';
  return 'laudo';
};

/** Um analito de exame laboratorial: só o nome e o valor, sem unidade. */
export interface ValorExame { nome: string; valor: string }

/** O que a IA devolve (texto livre, ainda não conferido). */
export interface LeituraExameIA {
  /** Classe do PDF inteiro (laudo_exame | atestado_relatorio); opcional — ver classificarExame. */
  classificacao?: string;
  documentos?: { tipo?: string; titulo?: string; data?: string; emissor?: string; texto?: string; exameMinimo?: string; valores?: { nome?: string; valor?: string }[]; especialidade?: string; categoria?: string }[];
}

const limpo = (v: unknown): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : '');

const chaveNome = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** O exame mínimo indicado pela IA, só se for um nome da lista (comparação sem acento/caixa; devolve o da lista). */
export const exameMinimoValido = (sugestao: unknown, lista: ReadonlyArray<string>): string => {
  const k = chaveNome(limpo(sugestao));
  return k ? lista.find(n => chaveNome(n) === k) ?? '' : '';
};

/** Analitos válidos (nome e valor preenchidos), sem espaços sobrando. */
const valoresDaLeitura = (v: unknown): ValorExame[] => (Array.isArray(v) ? v : [])
  .map(x => ({ nome: limpo(x?.nome).replace(/\s+/g, ' '), valor: limpo(x?.valor).replace(/\s+/g, ' ') }))
  .filter(x => x.nome && x.valor);

/**
 * Itens válidos da leitura: tipo conhecido (senão "outro"), data real e só documentos com título ou texto.
 * `examesMinimos` (envio pela Ficha): só aceita o enquadramento da IA que for um nome da lista. Os campos
 * opcionais (exameMinimo, valores) só entram quando preenchidos — o Firestore não aceita `undefined`.
 */
export const itensDaLeitura = (l: LeituraExameIA, examesMinimos: ReadonlyArray<string> = []): ItemExame[] => (l.documentos ?? [])
  .map(d => {
    const tipo: TipoDocumento = (TIPOS_DOCUMENTO as readonly string[]).includes(String(d?.tipo)) ? d!.tipo as TipoDocumento : 'outro';
    const item: ItemExame = {
      tipo,
      titulo: limpo(d?.titulo).replace(/\s+/g, ' '),
      data: dataCivilISO(limpo(d?.data)) || '',
      emissor: limpo(d?.emissor).replace(/\s+/g, ' '),
      texto: limpo(d?.texto),
    };
    const minimo = exameMinimoValido(d?.exameMinimo, examesMinimos);
    if (minimo) item.exameMinimo = minimo;
    const valores = tipo === 'exame_laboratorial' ? valoresDaLeitura(d?.valores) : [];
    if (valores.length) item.valores = valores;
    const especialidade = limpo(d?.especialidade).replace(/\s+/g, ' ');
    if (especialidade) item.especialidade = especialidade;
    if (ehCategoriaAtestado(d?.categoria)) item.categoria = d!.categoria as CategoriaAtestado;
    return item;
  })
  .filter(d => d.titulo || d.texto)
  .map(d => ({ ...d, titulo: d.titulo || ROTULO_TIPO[d.tipo] }));

/** Texto para a área de transferência: título, data e o laudo na íntegra. */
export const textoParaCopiar = (item: ItemExame): string => {
  const cabecalho = [item.titulo.toUpperCase(), item.data ? item.data.split('-').reverse().join('/') : ''].filter(Boolean).join(' — ');
  return [cabecalho, item.texto].filter(Boolean).join('\n');
};

/** Vários documentos (ex.: todos os exames da IS) separados por linha em branco. */
export const textosParaCopiar = (itens: ItemExame[]): string => itens.map(textoParaCopiar).join('\n\n');

/** Classe do PDF na Ficha do inspecionado: laudo de exame complementar × atestado/relatório médico. */
export const CLASSES_EXAME = ['laudo_exame', 'atestado_relatorio'] as const;
export type ClasseExame = typeof CLASSES_EXAME[number];
export const ROTULO_CLASSE: Record<ClasseExame, string> = { laudo_exame: 'Laudo de exame', atestado_relatorio: 'Atestado/relatório médico' };

const TIPOS_ATESTADO: ReadonlySet<TipoDocumento> = new Set(['laudo_medico', 'atestado', 'parecer']);
const ehExame = (t: TipoDocumento) => t === 'exame_imagem' || t === 'exame_laboratorial' || t === 'exame_funcional';

/** Classe pelos tipos dos documentos do PDF: a maioria decide; empate ou só "receita/outro" → laudo de exame
 *  só se houver exame, senão atestado/relatório quando houver documento do médico assistente; nada → laudo de exame. */
export const classeDosItens = (itens: ReadonlyArray<Pick<ItemExame, 'tipo'>>): ClasseExame => {
  const exames = itens.filter(i => ehExame(i.tipo)).length;
  const atestados = itens.filter(i => TIPOS_ATESTADO.has(i.tipo)).length;
  if (atestados > exames) return 'atestado_relatorio';
  return 'laudo_exame';
};

/** De onde veio a classificação: a IA, os tipos dos itens (fallback) ou a aba da Ficha onde o PDF foi enviado. */
export type OrigemClasseExame = 'ia' | 'tipos' | 'aba';

/** Classe final do PDF: a da IA quando válida; senão a dos tipos dos itens (fallback silencioso). */
export const classificarExame = (sugestaoIA: unknown, itens: ReadonlyArray<Pick<ItemExame, 'tipo'>>): { classe: ClasseExame; origem: 'ia' | 'tipos' } =>
  (CLASSES_EXAME as readonly string[]).includes(String(sugestaoIA))
    ? { classe: sugestaoIA as ClasseExame, origem: 'ia' }
    : { classe: classeDosItens(itens), origem: 'tipos' };

/** Classe de um PDF já gravado: o campo `classificacao` (novo) ou, nos antigos, a dos itens. */
export const classeDoExame = (exame: { classificacao?: unknown; itens?: ReadonlyArray<Pick<ItemExame, 'tipo'>> }): ClasseExame =>
  classificarExame(exame.classificacao, exame.itens ?? []).classe;
