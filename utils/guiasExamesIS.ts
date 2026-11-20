// Ficheiro: utils/guiasExamesIS.ts
// Regras puras do lado do app para as guias de exames da IS (as regras dos exames em si — quais exames
// por finalidade, sexo e idade — são de utils/guiasExames.ts, pacote A, e o servidor recalcula):
//  - casar a finalidade da IS (public/finalidadesIS.json) com a do Anexo O (data/anexoOExamesMinimos.json):
//    nome igual (sem acento/espaço extra) ou um apelido conhecido; quando não casa e o grupo pode ter
//    exames mínimos, o app pergunta ao Gemini (services/guiasExamesIA.ts);
//  - caixa "Guias entregues ao inspecionado?": o patch da IS ao marcar/desmarcar e o texto da entrega;
//  - situação do card "Guias de exames" no detalhe da IS e o texto do botão de e-mail.
import examesData from '../data/anexoOExamesMinimos.json';
import type { StatusIS } from './inspecoes';

const limpar = (s: string) => String(s || '').replace(/\s+/g, ' ').trim();
/** Chave de comparação: sem acentos, sem emoji/pontuação extra, minúsculas, espaços simples. */
export const chaveFinalidade = (s: string): string =>
  limpar(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9<>/(),+-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Nomes das finalidades do Anexo O (sem as quebras de linha do JSON), na ordem da página Exames mínimos. */
export const FINALIDADES_ANEXO_O: string[] = (examesData as { Finalidades_Inspecao: { Finalidade_Inspecao: string }[] }[])
  .flatMap(g => g.Finalidades_Inspecao.map(f => limpar(f.Finalidade_Inspecao)));

/** Finalidades da IS com nome diferente do Anexo O (chave da IS → nome no Anexo O). */
const APELIDOS: Record<string, string> = {
  'deixar o sam': 'Deixar o SAM, SMV, SMI ou SPG',
  'deixar o smv': 'Deixar o SAM, SMV, SMI ou SPG',
  'deixar o smi': 'Deixar o SAM, SMV, SMI ou SPG',
  'deixar o spg': 'Deixar o SAM, SMV, SMI ou SPG',
  'ingresso no smv (oriundos do smi)': 'Engajamento e Ingresso no SMV (oriundos do SMI)',
  'engajamento': 'Engajamento e Ingresso no SMV (oriundos do SMI)',
};

/** Grupos de finalidade sem exames mínimos no Anexo O: não geram guia e não perguntam à IA. */
export const GRUPOS_SEM_EXAMES_MINIMOS = ['Verificações e Términos', 'Benefícios', 'Justiça e Disciplina'];

/** Finalidade do Anexo O equivalente à da IS sem IA (nome igual ou apelido); null quando não casa. */
export const casarFinalidadeAnexoO = (finalidade: string): string | null => {
  const k = chaveFinalidade(finalidade);
  if (!k) return null;
  const igual = FINALIDADES_ANEXO_O.find(f => chaveFinalidade(f) === k);
  return igual ?? APELIDOS[k] ?? null;
};

/** O grupo da finalidade pode ter exames mínimos (só então vale perguntar à IA). */
export const grupoPodeTerExames = (grupoFinalidade: string | undefined): boolean =>
  !GRUPOS_SEM_EXAMES_MINIMOS.some(g => chaveFinalidade(g) === chaveFinalidade(grupoFinalidade || ''));

/** Precisa da IA para achar a finalidade do Anexo O: não casou sem IA e o grupo pode ter exames. */
export const precisaIdentificarFinalidade = (finalidade: string, grupoFinalidade?: string): boolean =>
  !casarFinalidadeAnexoO(finalidade) && grupoPodeTerExames(grupoFinalidade) && !!limpar(finalidade);

// ---------------------------------------------------------------- dados do inspecionado

/** Data de nascimento válida para as guias (AAAA-MM-DD, não futura, idade de 14 a 110 anos). */
export const erroDataNascimento = (data: string, hoje: string): string => {
  if (!data) return 'Informe a data de nascimento.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T12:00:00`))) return 'Data inválida.';
  if (data > hoje) return 'A data não pode ser futura.';
  const anos = Number(hoje.slice(0, 4)) - Number(data.slice(0, 4));
  if (anos < 14 || anos > 110) return 'Confira o ano de nascimento.';
  return '';
};

/** Primeiro nome (o único dado enviado à IA para sugerir o sexo). */
export const primeiroNome = (nome: string): string => limpar(nome).split(' ')[0]?.replace(/[^\p{L}'-]/gu, '') || '';

// ---------------------------------------------------------------- entrega das guias

export interface EstadoEntregaGuias {
  status: StatusIS;
  guiasEntregues?: boolean;
  guiasEntreguesEm?: string;
  guiasEntreguesVia?: 'presencial' | 'email';
  guiasEntreguesPor?: string;
}

/**
 * Patch da IS ao marcar/desmarcar "Guias entregues ao inspecionado?". `null` = apagar o campo.
 * Marcar: entrega presencial hoje, por quem marcou; Aberta → Realizando Exames.
 * Desmarcar: desfaz; Realizando Exames → Aberta (outros status ficam como estão).
 */
export const patchEntregaGuias = (
  atual: EstadoEntregaGuias, marcar: boolean, quem: string, hoje: string,
): Record<string, string | boolean | null> => {
  if (marcar) {
    return {
      guiasEntregues: true, guiasEntreguesEm: hoje, guiasEntreguesVia: 'presencial', guiasEntreguesPor: quem,
      ...(atual.status === 'aberta' ? { status: 'realizando_exames' } : {}),
    };
  }
  return {
    guiasEntregues: false, guiasEntreguesEm: null, guiasEntreguesVia: null, guiasEntreguesPor: null,
    ...(atual.status === 'realizando_exames' ? { status: 'aberta' } : {}),
  };
};

const dataBrCurta = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/** Complemento da caixa marcada: "por e-mail em dd/mm/aaaa" ou "em dd/mm/aaaa · fulano". */
export const textoEntregaGuias = (e: EstadoEntregaGuias): string => {
  if (!e.guiasEntregues) return '';
  const data = dataBrCurta(e.guiasEntreguesEm);
  if (e.guiasEntreguesVia === 'email') return data ? `por e-mail em ${data}` : 'por e-mail';
  return [data ? `em ${data}` : '', e.guiasEntreguesPor || ''].filter(Boolean).join(' · ');
};

/** A caixa só é editável na entrega presencial (a do e-mail é o registro do envio) e com a IS não finalizada. */
export const entregaEditavel = (e: EstadoEntregaGuias & { situacao?: string }): boolean =>
  e.situacao !== 'finalizada' && !(e.guiasEntregues && e.guiasEntreguesVia === 'email');

/** As guias já foram enviadas por e-mail ao inspecionado (marca do servidor; IS antigas: a entrega registrada via e-mail). */
export const guiasEnviadasAoInspecionado = (is: { emailGuiasInspecionadoEm?: unknown; guiasEntregues?: boolean; guiasEntreguesVia?: string }): boolean =>
  !!is.emailGuiasInspecionadoEm || (!!is.guiasEntregues && is.guiasEntreguesVia === 'email');

/** "Enviar por e-mail" ou "Reenviar por e-mail" (já houve envio das guias). */
export const rotuloEmailGuias = (jaEnviado: boolean): string => (jaEnviado ? 'Reenviar por e-mail' : 'Enviar por e-mail');

// ---------------------------------------------------------------- card do detalhe

export type SituacaoGuias = 'geradas' | 'sem_guias' | 'apagadas' | 'nao_se_aplica';

/**
 * Situação do card "Guias de exames":
 *  - geradas: há PDF (guiasExames preenchido);
 *  - apagadas: IS finalizada cujas guias existiram (guiasExames zerado pelo servidor = null, ou houve entrega/envio);
 *  - sem_guias: a finalidade tem exames mínimos e a IS ativa ainda não tem guias (geração falhou, IS antiga) → "Gerar guias";
 *  - nao_se_aplica: finalidade sem exames mínimos, ou IS finalizada que nunca teve guias.
 */
export const situacaoGuias = (
  is: { situacao?: string; guiasExames?: unknown; guiasEntregues?: boolean; emailGuiasEnviadoEm?: unknown },
  temExames: boolean,
): SituacaoGuias => {
  if (is.guiasExames) return 'geradas';
  if (is.situacao === 'finalizada') return is.guiasExames === null || is.guiasEntregues || is.emailGuiasEnviadoEm ? 'apagadas' : 'nao_se_aplica';
  return temExames ? 'sem_guias' : 'nao_se_aplica';
};

// ---------------------------------------------------------------- dialog de envio

export interface UsuarioSecretaria { uid: string; usuario: string; nome?: string }

/** Resposta de POST /api/secretaria/usuarios: aceita { usuarios: [...] } (padrão) ou o primeiro campo que for lista. */
export const extrairUsuariosSecretaria = (r: Record<string, unknown>): UsuarioSecretaria[] => {
  const lista = Array.isArray(r.usuarios) ? r.usuarios : Object.values(r).find(Array.isArray) ?? [];
  return (lista as Partial<UsuarioSecretaria>[])
    .filter(u => u && typeof u.uid === 'string' && typeof u.usuario === 'string' && u.usuario.trim() !== '')
    .map(u => ({ uid: u.uid as string, usuario: (u.usuario as string).trim(), ...(u.nome ? { nome: u.nome } : {}) }))
    .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'));
};

export interface EscolhaEnvioGuias {
  inspecionado: boolean;
  secretaria: boolean;
  secretariaUids: string[];
  /** E-mail digitado (só quando o cadastro não tem). */
  email: string;
}

/** Erro da escolha no dialog de envio das guias ('' = pode enviar). */
export const erroEscolhaEnvioGuias = (e: EscolhaEnvioGuias, emailCadastrado: string, emailValido: (s: string) => boolean): string => {
  if (!e.inspecionado && !e.secretaria) return 'Escolha para quem enviar.';
  if (e.secretaria && e.secretariaUids.length === 0) return 'Escolha ao menos um membro da SEC-JRS.';
  if (e.inspecionado && !emailCadastrado && !emailValido(e.email)) return 'Informe um e-mail válido do inspecionado.';
  return '';
};

/** Mensagem de sucesso do envio das guias. */
export const mensagemEnvioGuias = (isNumero: number | string, r: { paraInspecionado?: string; paraSecretaria: string[]; emailSalvo: boolean }): string => {
  const partes = [
    r.paraInspecionado ? `ao inspecionado (${r.paraInspecionado})` : '',
    r.paraSecretaria.length ? `à SEC-JRS (${r.paraSecretaria.length})` : '',
  ].filter(Boolean);
  return `Guias da IS ${isNumero} enviadas ${partes.join(' e ') || 'por e-mail'}.${r.emailSalvo ? ' E-mail salvo no cadastro do inspecionado.' : ''}`;
};

// ---------------------------------------------------------------- e-mail de abertura

/** Prazo do e-mail de abertura (item 2.1.2, alíneas b e c, da DGPM-406), para o resumo do dialog. */
export const prazoAberturaIS = (p: { grupoFinalidade?: string; comExamesMinimos: boolean; dataAbertura: string }): string => {
  const data = dataBrCurta(p.dataAbertura);
  if (chaveFinalidade(p.grupoFinalidade || '') === chaveFinalidade('Benefícios')) return `60 dias a partir de ${data} para agendar a IS.`;
  if (p.comExamesMinimos) return `7 dias úteis a partir de ${data} para comparecer à JRS e obter as guias dos exames.`;
  return `7 dias úteis a partir de ${data} para agendar a IS.`;
};

/** Guias INCDEF: VDF/Término de Incapacidade com "Incapaz definitivamente para o SAM" usam os exames de "Deixar o SAM". */
export const FINALIDADE_ANEXO_O_INCDEF = 'Deixar o SAM, SMV, SMI ou SPG';
