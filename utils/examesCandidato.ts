// Ficheiro: utils/examesCandidato.ts
// Exames dos candidatos de concurso transcritos do PDF pelo Gemini (ver
// PROMPT_EXAMES_CANDIDATO em apps-script/concursos/CodeConcursos.gs): tipos,
// normalização do JSON que chega do Apps Script e as regras de montagem dos
// textos que a tela de transcrição copia para a área de transferência.

/** Grupos de exame reconhecidos; "outro" é qualquer exame fora dos padrões do concurso. */
export type CategoriaExame =
  | 'hemograma' | 'eas' | 'bioquimica'
  | 'betaHcg' | 'vdrl' | 'antiHiv'
  | 'imagem' | 'colpocitologia' | 'ecg' | 'toxicologico'
  | 'outro';

export const CATEGORIAS_EXAME: CategoriaExame[] = [
  'hemograma', 'eas', 'bioquimica', 'betaHcg', 'vdrl', 'antiHiv',
  'imagem', 'colpocitologia', 'ecg', 'toxicologico', 'outro',
];

/** Um analito do hemograma, do EAS ou da bioquímica: só o nome e o valor, sem unidade. */
export interface ItemExame {
  nome: string;
  valor: string;
}

export interface ExameCandidato {
  /** Ordem no PDF (define a ordem de exibição). */
  ordem: number;
  categoria: CategoriaExame;
  /** Título do bloco, em maiúsculas e sem acentos (ex.: "HEMOGRAMA COMPLETO"). */
  nome: string;
  /** Identificação do paciente como consta naquele laudo. */
  paciente: string;
  /** Profissional emissor do laudo. */
  emissor: string;
  /** Conselho de classe e número (ex.: "CRM-PE 20674 / RQE 16460"). */
  conselho: string;
  /** Data do laudo, DD/MM/AAAA. */
  data: string;
  /** Exames de valores: um item por analito. Vazio nos demais. */
  itens: ItemExame[];
  /** Sorologias (Beta-HCG, VDRL, anti-HIV): resultado curto. */
  resultado: string;
  /** Laudo na íntegra (imagem, colpocitologia, ECG, toxicológico e "outro"). */
  texto: string;
}

export interface PacienteExames {
  nome: string;
  dataNascimento: string;
  cpf: string;
  identidade: string;
}

/** O que o Gemini devolve para um PDF de exames. */
export interface ExamesExtraidos {
  paciente: PacienteExames;
  exames: ExameCandidato[];
  /** Pontos que merecem conferência humana (valor fora da referência, carimbo ilegível...). */
  observacoes: string[];
}

/** Exames que são copiados como um bloco único (resultado junto com o emissor). */
const CATEGORIAS_BLOCO_UNICO: CategoriaExame[] = ['betaHcg', 'vdrl', 'antiHiv'];

/** Exames compostos: cada analito é copiado separadamente e o emissor fecha o bloco. */
export const ehExameDeValores = (categoria: CategoriaExame): boolean =>
  categoria === 'hemograma' || categoria === 'eas' || categoria === 'bioquimica';

export const ehExameBlocoUnico = (categoria: CategoriaExame): boolean =>
  CATEGORIAS_BLOCO_UNICO.includes(categoria);

/**
 * Exames de laudo em texto corrido (imagem, colpocitologia, ECG, toxicológico e
 * os fora do padrão): o texto copiado começa com "# NOME DO EXAME" e uma linha
 * em branco, para identificar o laudo ao colar.
 */
export const ehExameNarrativo = (categoria: CategoriaExame): boolean =>
  !ehExameDeValores(categoria) && !ehExameBlocoUnico(categoria);

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/** Mantém as quebras de linha do laudo, mas sem espaços à direita nem mais de uma linha em branco seguida. */
const textoMultilinha = (v: unknown): string =>
  (typeof v === 'string' ? v : '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const categoriaValida = (v: unknown): CategoriaExame =>
  CATEGORIAS_EXAME.includes(v as CategoriaExame) ? (v as CategoriaExame) : 'outro';

/**
 * Normaliza o JSON do Gemini: descarta exames sem conteúdo nenhum, garante os
 * campos e numera a ordem. Nada aqui confia no formato devolvido pelo modelo.
 */
export const normalizarExamesExtraidos = (bruto: any): ExamesExtraidos => {
  const p = bruto?.paciente || {};
  const lista: any[] = Array.isArray(bruto?.exames) ? bruto.exames : [];
  const exames: ExameCandidato[] = lista
    .map((e: any): ExameCandidato => ({
      ordem: 0,
      categoria: categoriaValida(e?.categoria),
      nome: texto(e?.nome).toUpperCase(),
      paciente: texto(e?.paciente),
      emissor: texto(e?.emissor),
      conselho: texto(e?.conselho),
      data: texto(e?.data),
      itens: (Array.isArray(e?.itens) ? e.itens : [])
        .map((i: any) => ({ nome: texto(i?.nome), valor: texto(i?.valor) }))
        .filter((i: ItemExame) => i.nome && i.valor),
      resultado: texto(e?.resultado),
      texto: textoMultilinha(e?.texto),
    }))
    .filter(e => e.nome && (e.itens.length > 0 || e.resultado || e.texto))
    .map((e, i) => ({ ...e, ordem: i + 1 }));

  return {
    paciente: {
      nome: texto(p.nome).toUpperCase(),
      dataNascimento: texto(p.dataNascimento),
      cpf: texto(p.cpf),
      identidade: texto(p.identidade),
    },
    exames,
    observacoes: (Array.isArray(bruto?.observacoes) ? bruto.observacoes : []).map(texto).filter(Boolean),
  };
};

/** "Dra. Fulana de Tal - CRBio-5 012345 - 12/10/2026" (só as partes que existem). */
export const linhaEmissor = (e: Pick<ExameCandidato, 'emissor' | 'conselho' | 'data'>): string =>
  [e.emissor, e.conselho, e.data].map(x => x.trim()).filter(Boolean).join(' - ');

/** "Hemoglobina: 15,4" — o que é copiado por item nos exames de valores. */
export const textoItem = (i: ItemExame): string => `${i.nome}: ${i.valor}`;

/**
 * Texto do bloco inteiro, para o botão "Copiar tudo":
 *  - exames de valores: um "Analito: valor" por linha e o emissor ao final;
 *  - Beta-HCG, VDRL e anti-HIV: resultado e emissor juntos;
 *  - imagem, colpocitologia, ECG, toxicológico e "outro": "# NOME DO EXAME",
 *    linha em branco, o laudo e o emissor ao final.
 */
export const textoCopiaExame = (e: ExameCandidato): string => {
  const emissor = linhaEmissor(e);
  const partes: string[] = [];
  // As partes são unidas por "\n\n", então o título já sai seguido de linha em branco.
  if (ehExameNarrativo(e.categoria)) partes.push(`# ${e.nome}`);
  if (ehExameDeValores(e.categoria)) partes.push(e.itens.map(textoItem).join('\n'));
  else if (ehExameBlocoUnico(e.categoria)) partes.push(e.resultado);
  else partes.push(e.texto);
  if (emissor) partes.push(emissor);
  return partes.filter(Boolean).join('\n\n');
};
