// Ficheiro: servidor/email/resultadoIS.ts
// E-mail "Resultado de Inspeção de Saúde" ao inspecionado, pela Gmail API da conta Google da JRS
// (a mesma dos e-mails de impressão — servidor/google/impressao.ts). Só IS com TIS assinado. O servidor
// lê a IS e o cadastro do inspecionado no Firestore (o app manda só o id da IS e, quando o cadastro não
// tem e-mail, o e-mail informado — que fica gravado no cadastro). Remetente "HNRe - Junta Regular de Saúde",
// cópia oculta para a caixa da JRS e "Responder para" a mesma caixa. HTML puro (Zimbra não roda JavaScript).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { TEMPLATE_RESULTADO_IS } from './templateResultadoIS';

const APP_URL = (process.env.APP_URL || 'https://mauriston.github.io/DoencasEPareceresJRS/').replace(/\/?$/, '/');

/** Textos fixos do e-mail (podem ser trocados por variável de ambiente do Cloud Run). */
export const CONFIG_EMAIL_RESULTADO = {
  nomeRemetente: 'HNRe - Junta Regular de Saúde',
  emailJrs: process.env.EMAIL_JRS || 'hnre.jrs@marinha.mil.br',
  bannerUrl: process.env.EMAIL_BANNER_URL || 'https://i.imgur.com/Btu1CAG.png',
  logoRodapeUrl: process.env.EMAIL_LOGO_RODAPE_URL || `${APP_URL}email/logo-marinha-fundo-claro.png`,
  instanciaRecurso: 'Junta Superior Distrital (JSD/COM3ºDN)',
  prazoRecursoDias: 45,
  supervisorNome: process.env.JRS_SUPERVISOR_NOME || 'Alessandro Giorginis Fidelis de Souza',
  supervisorPosto: process.env.JRS_SUPERVISOR_POSTO || 'Suboficial-RM1-EF',
  presidenteNome: process.env.JRS_PRESIDENTE_NOME || 'Mauriston Renan Martins Silva',
  presidentePosto: process.env.JRS_PRESIDENTE_POSTO || 'Capitão-Tenente (Md)',
};

// ---------------------------------------------------------------- Template (subconjunto do Mustache)

const escHtml = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

type Valor = string | number | boolean | Record<string, unknown>[] | undefined;
export type DadosTemplate = Record<string, Valor>;

/**
 * Preenche o template: {{nome}} (sempre escapado para HTML) e seções {{#nome}}…{{/nome}} — booleano
 * (mostra ou não) ou lista (repete o miolo para cada item, com os campos do item). Exportada para os testes.
 */
export const renderizarTemplate = (template: string, dados: DadosTemplate): string => {
  const secoes = template.replace(/\{\{#(\w+)\}\}\n?([\s\S]*?)\{\{\/\1\}\}\n?/g, (_m, nome: string, miolo: string) => {
    const v = dados[nome];
    if (Array.isArray(v)) return v.map(item => renderizarTemplate(miolo, { ...dados, ...(item as DadosTemplate) })).join('');
    return v ? renderizarTemplate(miolo, dados) : '';
  });
  return secoes.replace(/\{\{(\w+)\}\}/g, (_m, nome: string) => escHtml(dados[nome]));
};

// ---------------------------------------------------------------- Dados da IS

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
/** "2026-10-30" → "30OUT2026" (vazio quando a data não é AAAA-MM-DD). */
export const dataNaval = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m && MESES[Number(m[2]) - 1] ? `${m[3]}${MESES[Number(m[2]) - 1]}${m[1]}` : '';
};

/** Restrições gravadas ("A; B; C") → ["A;", "B; e", "C."] — pontuação de enumeração das mensagens navais. */
export const itensDeRestricoes = (texto: string): string[] => {
  const lista = String(texto || '').split(';').map(s => s.trim().replace(/[.;,]+$/, '')).filter(Boolean);
  return lista.map((r, i) => (i === lista.length - 1 ? `${r}.` : i === lista.length - 2 ? `${r}; e` : `${r};`));
};

/** E-mail com formato aceitável (um endereço, sem espaços nem vírgulas). */
export const emailValido = (e: string): boolean => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(e);

export interface ISParaEmail {
  is: number | string;
  finalidade?: string;
  inspecionado?: string;
  tis?: string;
  dataLaudo?: string;
  laudo?: string;
  restricoes?: string;
}

/** Monta assunto, HTML e texto simples do e-mail (sem enviar). Exportada para os testes. */
export const montarEmailResultado = (is: ISParaEmail, om?: string) => {
  const c = CONFIG_EMAIL_RESULTADO;
  const inspecionado = [String(is.inspecionado || '').trim(), om ? `(${om})` : ''].filter(Boolean).join(' ');
  const finalidade = String(is.finalidade || '').trim();
  const laudo = String(is.laudo || '').trim().replace(/^"+|"+$/g, '');
  const restricoes = itensDeRestricoes(is.restricoes || '');
  const dados: DadosTemplate = {
    vocativo: 'Prezado(a) Senhor(a),',
    inspecionado,
    finalidade_is: finalidade,
    numero_is: String(is.is),
    numero_tis: String(is.tis || '').trim() || '—',
    data_conclusao: dataNaval(is.dataLaudo || '') || '—',
    laudo,
    tem_restricoes: restricoes.length > 0,
    restricoes: restricoes.map(item => ({ item })),
    instancia_recurso: c.instanciaRecurso,
    prazo_recurso_dias: c.prazoRecursoDias,
    mostrar_supervisor: true,
    supervisor_nome: c.supervisorNome,
    supervisor_posto: c.supervisorPosto,
    presidente_nome: c.presidenteNome,
    presidente_posto: c.presidentePosto,
    banner_url: c.bannerUrl,
    logo_rodape_url: c.logoRodapeUrl,
  };
  const texto = [
    'Prezado(a) Senhor(a),', '',
    `Após reunião em plenário da JRS/HNRe, INF o resultado da IS ${finalidade}, conforme dados abaixo:`, '',
    'RESULTADO DA INSPEÇÃO DE SAÚDE',
    `Inspecionado: ${inspecionado}`,
    `Finalidade IS: ${finalidade}`,
    `Nº da IS: ${dados.numero_is}`,
    `Nº do TIS: ${dados.numero_tis}`,
    `Data de conclusão: ${dados.data_conclusao}`,
    `Laudo: "${laudo}"`,
    ...(restricoes.length ? ['Restrições:', ...restricoes.map(r => `- ${r}`)] : []), '',
    '1. ORIENTAÇÕES PARA INTERPOSIÇÃO DE RECURSOS',
    `Caso discorde do laudo, tem o direito de interpor recurso de 1ª instância à ${c.instanciaRecurso} mediante requerimento dirigido ao Titular do SDP (COM3ºDN), por intermédio do Titular de sua OM, em até ${c.prazoRecursoDias} dias a contar da data deste comunicado.`, '',
    '2. SOLICITAÇÃO DE DOCUMENTOS MÉDICO-PERICIAIS',
    'Caso deseje obter o Termo de Inspeção de Saúde (TIS) referente a IS realizada, poderá ser feita solicitação ao Centro de Perícias Médicas da Marinha (CPMM):',
    '- Requerimento: https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods',
    '- Orientações: https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/orientacoes%20carta%20de%20servico%20cpmm.pdf',
    '- Site oficial do CPMM: https://www.marinha.mil.br/cpmm/carta-usuario-cpmm',
    'E-mail para envio do requerimento: cpmm.secom@marinha.mil.br · Telefone do CPMM: (21) 2126-5398', '',
    'Respeitosamente,', '',
    'Por ordem de:', c.supervisorNome, c.supervisorPosto, 'Supervisor', '',
    c.presidenteNome, c.presidentePosto, 'Presidente', '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${c.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return {
    assunto: `Resultado de IS — ${finalidade} — ${inspecionado}`,
    html: renderizarTemplate(TEMPLATE_RESULTADO_IS, dados),
    texto,
  };
};

// ---------------------------------------------------------------- Envio

/**
 * Envia o resultado da IS `isId` ao inspecionado. `emailInformado` só é usado quando o cadastro não tem
 * e-mail (e então é gravado em militares/{id}.email). Registra o envio na IS. Devolve o destinatário.
 */
export const enviarResultadoIS = async (db: Firestore, isIdBruto: unknown, emailInformadoBruto: unknown, uid: string): Promise<{ para: string; emailSalvo: boolean }> => {
  const isId = String(isIdBruto ?? '').replace(/\D/g, '');
  if (!isId) throw new ErroContaGoogle('falha', 'Informe a IS.');
  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as ISParaEmail & { status?: string; inspecionadoId?: string };
  if (is.status !== 'tis_assinado') throw new ErroContaGoogle('falha', 'Só é possível enviar o resultado de IS finalizada (TIS assinado).');
  if (!String(is.laudo || '').trim()) throw new ErroContaGoogle('falha', 'A IS não tem laudo registrado.');

  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const militar = refMilitar ? ((await refMilitar.get()).data() as { email?: string; emailPessoal?: string; om?: string } | undefined) : undefined;
  const cadastrado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  const informado = String(emailInformadoBruto ?? '').trim().toLowerCase();
  const para = cadastrado || informado;
  if (!para) throw new ErroContaGoogle('falha', 'O inspecionado não tem e-mail cadastrado. Informe o e-mail.');
  if (!emailValido(para)) throw new ErroContaGoogle('falha', 'E-mail do inspecionado inválido.');

  const { assunto, html, texto } = montarEmailResultado(is, militar?.om);
  await enviarEmail(db, {
    para, cco: CONFIG_EMAIL_RESULTADO.emailJrs, responderPara: CONFIG_EMAIL_RESULTADO.emailJrs,
    assunto, html, texto, nomeRemetente: CONFIG_EMAIL_RESULTADO.nomeRemetente,
  });

  // O e-mail informado passa a ser o do cadastro (só quando o cadastro não tinha nenhum).
  const emailSalvo = !cadastrado && !!refMilitar && !!militar;
  if (emailSalvo) await refMilitar!.update({ email: para, atualizadoEm: FieldValue.serverTimestamp() });
  await refIs.update({ emailResultadoEnviadoEm: FieldValue.serverTimestamp(), emailResultadoPara: para, emailResultadoEnviadoPor: uid });
  return { para, emailSalvo };
};
