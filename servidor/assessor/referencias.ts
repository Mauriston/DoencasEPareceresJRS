// Ficheiro: servidor/assessor/referencias.ts
// Textos da skill "Assessor Pericial DGPM-406" (assessor/skill/ — fonte única com o Claude Code) que o Assessor IA
// manda ao modelo. Não vai a DGPM-406 inteira em cada pedido: além das instruções (SKILL.md e as referências de
// redação), só os capítulos indicados pela regra da finalidade (campo `fonte` das formas de conclusão, ex.:
// "6.1, 6.2.1" → Cap. 6; "11.8" → Cap. 11), o Cap. 11 para temporários (SMV/SMI), o Cap. 10 para servidor civil
// e, em Benefícios, o enquadramento da Portaria GM-MD nº 3.551/2021.
// Os arquivos são lidos do disco (assessor/skill/ na raiz do app — o Dockerfile copia a pasta) e guardados em memória.
// `capitulosDaRegra` é pura e testada (utils/__tests__/assessorServidor.test.ts).
import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ_SKILL = () => path.join(process.env.ASSESSOR_SKILL_DIR || path.join(process.cwd(), 'assessor', 'skill'));

const cache = new Map<string, Promise<string>>();
const ler = (relativo: string): Promise<string> => {
  let p = cache.get(relativo);
  if (!p) {
    p = fs.readFile(path.join(RAIZ_SKILL(), relativo), 'utf8').catch(e => { cache.delete(relativo); throw e; });
    cache.set(relativo, p);
  }
  return p;
};
const lerOpcional = (relativo: string): Promise<string> => ler(relativo).catch(() => '');

/** Capítulos da DGPM-406 citados na fonte da regra (ex.: "6.1, 6.2.1 e 11.8" → [6, 11]). */
export const capitulosDaFonte = (fonte: string | undefined): number[] => {
  const nums = new Set<number>();
  for (const m of String(fonte || '').matchAll(/\b(\d{1,2})\.\d/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 18) nums.add(n);
  }
  return [...nums].sort((a, b) => a - b);
};

export interface EntradaCapitulos {
  /** `fonte` da regra das formas de conclusão (ou '' sem regra). */
  fonte: string;
  grupoFinalidade: string;
  /** Vínculo do app: Carreira, Temporário, Inativo, Pensionista, Dependente. */
  vinculo: string;
  tipoServico: string;
  servidorCivil: boolean;
}

/** Capítulos a mandar: os da regra + Eixo B (roteamento-finalidade.md). Sem regra: o capítulo-base do grupo. */
export const capitulosDaRegra = (e: EntradaCapitulos): number[] => {
  const caps = new Set(capitulosDaFonte(e.fonte));
  if (!caps.size) {
    if (e.grupoFinalidade === 'Verificações e Términos') caps.add(6);
    else if (e.grupoFinalidade === 'Benefícios') caps.add(9);
    else if (e.grupoFinalidade === 'Licenciamento') caps.add(8);
    else caps.add(4);
  }
  if (e.vinculo === 'Temporário' && (e.tipoServico === 'SMV' || e.tipoServico === 'SMI')) caps.add(11);
  if (e.servidorCivil) caps.add(10);
  return [...caps].sort((a, b) => a - b);
};

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export interface ReferenciasAssessor {
  skill: string;
  apoio: { titulo: string; texto: string }[];
}

/** Monta as referências do pedido. */
export const carregarReferencias = async (e: EntradaCapitulos): Promise<ReferenciasAssessor> => {
  const [skill, redacao, entrevista, roteamento, correcoes, exemplos] = await Promise.all([
    ler('SKILL.md'),
    lerOpcional('referencias/redacao-pericial.md'),
    lerOpcional('referencias/entrevista-previa.md'),
    lerOpcional('referencias/roteamento-finalidade.md'),
    lerOpcional('referencias/correcoes.md'),
    lerOpcional('referencias/exemplos.md'),
  ]);
  const caps = capitulosDaRegra(e);
  const textosCaps = await Promise.all(caps.map(async n => ({
    titulo: `DGPM-406, 9ª Rev — Capítulo ${n} (referencias/dgpm-406/capitulo-${doisDigitos(n)}.md)`,
    texto: await lerOpcional(`referencias/dgpm-406/capitulo-${doisDigitos(n)}.md`),
  })));
  const beneficios = e.grupoFinalidade === 'Benefícios'
    ? await Promise.all([
      ['Enquadramento de benefício (referencias/enquadramento-beneficio.md)', 'referencias/enquadramento-beneficio.md'],
      ['Doenças de lei (referencias/doencas-de-lei.json)', 'referencias/doencas-de-lei.json'],
      ['DGPM-406 — Anexo U (referencias/dgpm-406/anexos/anexo-u.md)', 'referencias/dgpm-406/anexos/anexo-u.md'],
    ].map(async ([titulo, arq]) => ({ titulo, texto: await lerOpcional(arq) })))
    : [];
  const apoio = [
    { titulo: 'Redação pericial (referencias/redacao-pericial.md)', texto: redacao },
    { titulo: 'Entrevista prévia (referencias/entrevista-previa.md)', texto: entrevista },
    { titulo: 'Roteamento por finalidade (referencias/roteamento-finalidade.md)', texto: roteamento },
    { titulo: 'Correções e errata — precedência máxima (referencias/correcoes.md)', texto: correcoes },
    { titulo: 'Casos-modelo (referencias/exemplos.md)', texto: exemplos },
    ...textosCaps,
    ...beneficios,
  ].filter(r => r.texto.trim());
  return { skill, apoio };
};
