// Ficheiro: servidor/email/nac.ts
// E-mail "INSPEÇÕES DE SAÚDE VDF E TÉRMINOS" ao NAC (Núcleo de Avaliação e Controle), com anexo em PDF, pela Gmail
// API da conta Google da JRS. Rota POST /api/email/nac { isIds } (Admin e Secretaria).
//  - Entram só IS finalizadas (TIS assinado) do grupo Verificações e Términos ainda não enviadas (utils/emailNac.ts);
//    o servidor relê cada IS e ignora as que não são mais pendentes.
//  - Período = data do laudo mais antiga e mais recente das IS enviadas.
//  - E-mail: só o nome do inspecionado (OM e nº da IS na 2ª linha). Anexo: "POSTO NIP NOME".
//  - PARA/CC/CCO fixos de config/emails (padrão: encarregada do NAC; CC caixa da JRS) + CC com os e-mails
//    institucionais dos user_medicos_geral ativos com cargo "SMI". Reply-To = caixa da JRS.
//  - Grava `emailNacEnviadoEm` e `emailNacEnviadoPor` em cada IS enviada.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { htmlParaPdf } from '../documentos/gerarPdf';
import { renderizarTemplate } from './template';
import { TEMPLATE_NAC } from './templateNac';
import { TEMPLATE_ANEXO_NAC } from './templateAnexoNac';
import { CONFIG_EMAIL_RESULTADO } from './resultadoIS';
import { nomeSemPostoNip } from './agendaIS';
import { ASSINATURA_PRESIDENTE_DATA_URI, AVISO_ACESSO_RESTRITO_DATA_URI, FONTE_MONTSERRAT_DATA_URI, LOGO_MARINHA_DATA_URI } from './recursosAnexo';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { CONFIG_EMAILS_PADRAO } from '../../config/emails';
import { ASSUNTO_NAC, dataBrNac, ehCargoSmi, paginarNac, pendenteNac, periodoNac } from '../../utils/emailNac';
import { ehInstitucional } from '../../utils/emailAgendaIS';

const APP_URL = (process.env.APP_URL || 'https://mauriston.github.io/DoencasEPareceresJRS/').replace(/\/?$/, '/');
export const NOME_REMETENTE_NAC = 'JRS/HNRe';
const FECHO = 'ATT/RPT,';
const AVISO_URL = process.env.EMAIL_AVISO_RESTRITO_URL || `${APP_URL}email/aviso-acesso-restrito.png`;
/** Limite por envio (o anexo pagina; acima disso o e-mail fica grande demais). */
const MAX_IS = 300;

export interface ItemNac {
  /** AAAA-MM-DD do laudo. */
  dataLaudo: string;
  /** "POSTO NIP NOME" (texto da IS). */
  inspecionado: string;
  /** Só o nome (cadastro; senão o texto da IS sem posto e NIP). */
  nomeCompleto?: string;
  om: string;
  numero_is: string;
  finalidade: string;
  laudo: string;
}

const maiusculas = (t: unknown) => String(t ?? '').trim().toLocaleUpperCase('pt-BR');

/** Assunto, HTML do e-mail (sem JavaScript), texto simples e HTML do anexo. Exportada para os testes. */
export const montarEmailNac = (itens: ItemNac[], assinatura: DadosAssinatura = assinaturaSemSignatario(), saudacao: string = CONFIG_EMAILS_PADRAO.saudacaoNac) => {
  const ordenados = [...itens].sort((a, b) => a.dataLaudo.localeCompare(b.dataLaudo) || Number(a.numero_is) - Number(b.numero_is));
  const { inicio, fim } = periodoNac(ordenados.map(i => i.dataLaudo));
  const linhas = ordenados.map(i => ({
    data: dataBrNac(i.dataLaudo) || '—',
    nome: maiusculas(i.inspecionado),
    nome_completo: maiusculas(i.nomeCompleto || nomeSemPostoNip(i.inspecionado)),
    om: i.om || '—',
    numero_is: i.numero_is,
    finalidade: i.finalidade || '—',
    laudo: String(i.laudo || '').trim().replace(/^"+|"+$/g, '') || '—',
  }));
  const html = renderizarTemplate(TEMPLATE_NAC, {
    saudacao, periodo_inicio: inicio, periodo_fim: fim, itens: linhas, fecho: FECHO, ...assinatura,
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, aviso_url: AVISO_URL, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const htmlAnexo = renderizarTemplate(TEMPLATE_ANEXO_NAC, {
    periodo_inicio: inicio, periodo_fim: fim, paginas: paginarNac(linhas) as unknown as Record<string, unknown>[],
    fonte_montserrat: FONTE_MONTSERRAT_DATA_URI, aviso: AVISO_ACESSO_RESTRITO_DATA_URI, assinatura_presidente: ASSINATURA_PRESIDENTE_DATA_URI, logo_rodape: LOGO_MARINHA_DATA_URI,
  });
  const texto = [
    'INFORMAÇÃO PESSOAL – ACESSO RESTRITO', '',
    saudacao, '',
    `PTC lista de militares submetidos a IS de Verificações e Términos referente ao período entre ${inicio} a ${fim}.`, '',
    'INSPEÇÕES DE SAÚDE - NAC',
    ...linhas.map(l => `${l.data} · ${l.nome_completo} (${l.om} · ${l.numero_is}) · ${l.finalidade} · ${l.laudo}`), '',
    'À disposição para quaisquer esclarecimentos adicionais.', '',
    assinaturaTexto(assinatura, FECHO), '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  const arquivo = `IS_VDF_TERMINOS_NAC_${(inicio || 'periodo').replace(/\//g, '-')}_A_${(fim || '').replace(/\//g, '-')}.pdf`;
  return { assunto: ASSUNTO_NAC, html, texto, htmlAnexo, arquivo, periodo: { inicio, fim } };
};

/** E-mails institucionais dos user_medicos_geral ativos com cargo "SMI" (CC dinâmico). */
export const ccSmi = (usuarios: { perfil?: string; ativo?: boolean; cargo?: string; email?: string }[]): string[] =>
  usuarios.filter(u => u.ativo !== false && u.perfil === 'user_medicos_geral' && ehCargoSmi(u.cargo))
    .map(u => String(u.email || '').trim().toLowerCase()).filter(ehInstitucional);

/** Envia ao NAC as IS escolhidas (só as ainda pendentes) e registra o envio em cada uma. */
export const enviarNac = async (db: Firestore, isIdsBruto: unknown, uid: string): Promise<{ enviados: number; para: string[]; cc: string[]; periodo: { inicio: string; fim: string } }> => {
  const ids = Array.from(new Set((Array.isArray(isIdsBruto) ? isIdsBruto : []).map(v => String(v ?? '').replace(/\D/g, '')).filter(Boolean)));
  if (!ids.length) throw new ErroContaGoogle('falha', 'Escolha ao menos uma IS.');
  if (ids.length > MAX_IS) throw new ErroContaGoogle('falha', `No máximo ${MAX_IS} IS por e-mail.`);

  const snaps = await db.getAll(...ids.map(id => db.collection('inspecoes').doc(id)));
  const iss = snaps.filter(s => s.exists).map(s => ({ ref: s.ref, d: s.data() as Record<string, any> })).filter(x => pendenteNac(x.d));
  if (!iss.length) throw new ErroContaGoogle('falha', 'Nenhuma das IS escolhidas está pendente de envio ao NAC (finalizadas de Verificações e Términos).');

  const militarIds = [...new Set(iss.map(x => String(x.d.inspecionadoId || '')).filter(Boolean))];
  const militares = new Map<string, Record<string, any>>();
  if (militarIds.length) (await db.getAll(...militarIds.map(id => db.collection('militares').doc(id)))).forEach(m => { if (m.exists) militares.set(m.id, m.data() as Record<string, any>); });

  const fixos = await destinatariosFixos(db, 'nac');
  const usuarios = (await db.collection('usuarios').get()).docs.map(u => u.data() as Record<string, any>);
  const para = juntarEmails([fixos.para]);
  if (!para.length) throw new ErroContaGoogle('falha', 'Configure o destinatário do e-mail ao NAC em Configurações.');
  const cc = juntarEmails([fixos.cc, ccSmi(usuarios)], para);
  const cco = juntarEmails([fixos.cco], [...para, ...cc]);

  const { assunto, html, texto, htmlAnexo, arquivo, periodo } = montarEmailNac(iss.map(({ d }) => {
    const m = militares.get(String(d.inspecionadoId || ''));
    return {
      dataLaudo: String(d.dataLaudo || ''), inspecionado: String(d.inspecionado || ''), nomeCompleto: m?.nome ? String(m.nome) : undefined,
      om: String(m?.om || ''), numero_is: String(d.is ?? ''), finalidade: String(d.finalidade || ''), laudo: String(d.laudo || ''),
    };
  }), await assinaturaDe(db, uid, fixos.config), fixos.config.saudacaoNac);

  const pdf = await htmlParaPdf(htmlAnexo);
  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined, responderPara: fixos.responderPara,
    assunto, html, texto, nomeRemetente: NOME_REMETENTE_NAC, anexo: { nome: arquivo, bytes: pdf },
  });

  const lote = db.batch();
  iss.forEach(({ ref }) => lote.update(ref, { emailNacEnviadoEm: FieldValue.serverTimestamp(), emailNacEnviadoPor: uid }));
  await lote.commit();
  return { enviados: iss.length, para, cc, periodo };
};
