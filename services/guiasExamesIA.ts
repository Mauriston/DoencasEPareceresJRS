// Ficheiro: services/guiasExamesIA.ts
// Etapa de IA (Firebase AI Logic — services/geminiAI.ts) antes de gerar as guias de exames da IS: identifica a
// finalidade da IS no Anexo O, o sexo e a idade do inspecionado.
//  - Finalidade: quando o nome da finalidade da IS casa com o Anexo O (nome igual ou apelido conhecido —
//    utils/guiasExamesIS.ts), não chama a IA. Senão (e se o grupo pode ter exames mínimos), o Gemini escolhe a
//    finalidade equivalente da lista do Anexo O, com resposta em esquema enum (ou "NENHUMA").
//  - Sexo e idade: vêm do cadastro (a IA recebe só "Masculino/Feminino" e a idade em anos, nunca nome, NIP ou
//    data de nascimento) e o resultado da IA só confirma — o cadastro prevalece. Sem sexo no cadastro, a IA
//    sugere pelo PRIMEIRO NOME (sugerirSexoPeloNome) e o usuário confirma no formulário.
// O servidor recalcula os exames a partir da finalidade, do sexo e da data de nascimento.
import { gerarComGemini, lerJsonIA } from './geminiAI';
import type { SexoInspecionado } from './firestoreMilitares';
import { finalidadeTemExamesMinimos, idadeEm } from '../utils/guiasExames';
import { logErroSeguro } from '../utils/logSeguro';
import {
  FINALIDADES_ANEXO_O, casarFinalidadeAnexoO, grupoPodeTerExames, primeiroNome,
} from '../utils/guiasExamesIS';

const NENHUMA = 'NENHUMA';

export interface DadosGuiasIA {
  /** Finalidade do Anexo O equivalente; null = sem exames mínimos (não gera guias). */
  finalidadeAnexoO: string | null;
  /** Como a finalidade foi achada. */
  origem: 'nome' | 'ia' | 'grupo_sem_exames';
  sexo?: SexoInspecionado;
  idade?: number;
  /** A finalidade achada tem exames que geram guia. */
  temExames: boolean;
}

const perguntarFinalidade = async (finalidade: string, grupo: string, sexo?: SexoInspecionado, idade?: number) => {
  const r = await gerarComGemini({
    contexto: 'guias de exames: finalidade do Anexo O',
    instrucoes: [
      'Você ajuda a Junta Regular de Saúde (Marinha do Brasil) a gerar as guias dos exames mínimos de uma Inspeção de Saúde (IS),',
      'conforme o Anexo O da DGPM-406. A finalidade da IS foi cadastrada com um nome que pode diferir do nome usado no Anexo O.',
      `Finalidade da IS: "${finalidade}" (grupo: "${grupo || 'não informado'}").`,
      `Sexo do inspecionado: ${sexo || 'não informado'}. Idade: ${Number.isFinite(idade) ? `${idade} anos` : 'não informada'}.`,
      'Escolha, na lista do campo "finalidade", a finalidade do Anexo O que corresponde a ela.',
      `Se nenhuma corresponder (ex.: verificações, términos, benefícios, justiça), responda "${NENHUMA}".`,
      'Repita em "sexo" e "idade" os dados informados (use "NAO_INFORMADO" e -1 quando não informados).',
    ].join('\n'),
    arquivos: [],
    temperature: 0,
    maxOutputTokens: 256,
    esquema: S => S.object({
      properties: {
        finalidade: S.enumString({ enum: [...FINALIDADES_ANEXO_O, NENHUMA] }),
        sexo: S.enumString({ enum: ['Masculino', 'Feminino', 'NAO_INFORMADO'] }),
        idade: S.integer(),
      },
    }),
  });
  return lerJsonIA<{ finalidade?: string; sexo?: string; idade?: number }>(r, 'A IA devolveu uma resposta inválida. Tente novamente.');
};

/**
 * Identifica finalidade (Anexo O), sexo e idade para as guias. Lança erro quando precisa da IA e ela falha
 * (o dialog mostra "Tentar de novo").
 */
export const identificarDadosGuias = async (p: {
  finalidade: string; grupoFinalidade?: string; sexo?: SexoInspecionado; dataNascimento?: string; hoje?: string;
}): Promise<DadosGuiasIA> => {
  const idade = p.dataNascimento ? idadeEm(p.dataNascimento, p.hoje) : undefined;
  const base = { sexo: p.sexo, idade: Number.isFinite(idade) ? idade : undefined };
  const porNome = casarFinalidadeAnexoO(p.finalidade);
  if (porNome) return { ...base, finalidadeAnexoO: porNome, origem: 'nome', temExames: finalidadeTemExamesMinimos(porNome) };
  if (!grupoPodeTerExames(p.grupoFinalidade)) return { ...base, finalidadeAnexoO: null, origem: 'grupo_sem_exames', temExames: false };

  const j = await perguntarFinalidade(p.finalidade, p.grupoFinalidade || '', base.sexo, base.idade);
  const escolhida = FINALIDADES_ANEXO_O.find(f => f === j.finalidade) ?? null;
  // O cadastro prevalece; divergência da IA só vai para o log (sem dados pessoais).
  if (base.sexo && j.sexo && j.sexo !== 'NAO_INFORMADO' && j.sexo !== base.sexo) logErroSeguro('guias: a IA divergiu do sexo do cadastro', null);
  if (base.idade !== undefined && typeof j.idade === 'number' && j.idade >= 0 && j.idade !== base.idade) logErroSeguro('guias: a IA divergiu da idade do cadastro', null);
  return { ...base, finalidadeAnexoO: escolhida, origem: 'ia', temExames: !!escolhida && finalidadeTemExamesMinimos(escolhida) };
};

/** Sugestão do sexo pelo primeiro nome (o usuário confirma). null quando a IA não sabe ou falha. */
export const sugerirSexoPeloNome = async (nome: string): Promise<SexoInspecionado | null> => {
  const primeiro = primeiroNome(nome);
  if (!primeiro) return null;
  try {
    const r = await gerarComGemini({
      contexto: 'guias de exames: sexo pelo nome',
      instrucoes: `Primeiro nome de uma pessoa no Brasil: "${primeiro}". Qual o sexo mais provável? Se o nome for ambíguo, responda "INDEFINIDO".`,
      arquivos: [],
      temperature: 0,
      maxOutputTokens: 64,
      esquema: S => S.object({ properties: { sexo: S.enumString({ enum: ['Masculino', 'Feminino', 'INDEFINIDO'] }) } }),
    });
    const j = lerJsonIA<{ sexo?: string }>(r, 'Resposta inválida.');
    return j.sexo === 'Masculino' || j.sexo === 'Feminino' ? j.sexo : null;
  } catch {
    return null;
  }
};
