// Ficheiro: servidor/email/agendaIS.ts
// E-mail "IS AGENDADAS EM dd/mm/aaaa" com as Inspeções de Saúde do dia seguinte e o anexo em PDF (A4 paisagem),
// pela Gmail API da conta Google da JRS (servidor/google/impressao.ts → enviarEmail).
//  - Automático: Cloud Scheduler às 18h (Recife) de domingo a quinta chama /api/agendador/agenda-is; não sai em
//    véspera de feriado; sai mesmo sem IS agendadas; uma vez por data (o reenvio é só manual).
//  - Manual: o Admin escolhe o dia na página Inspeções de Saúde (/api/email/agenda-is).
// O PDF fica no Firebase Storage, um arquivo por data (caminhoPdfAgendaIS): reenviar substitui o anterior,
// sem duplicar. O envio fica registrado em emailsAgendaIS/{AAAA-MM-DD}.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { htmlParaPdf } from '../documentos/gerarPdf';
import { renderizarTemplate, type DadosTemplate } from './template';
import { TEMPLATE_AGENDA_IS } from './templateAgendaIS';
import { TEMPLATE_ANEXO_AGENDA_IS } from './templateAnexoAgendaIS';
import { FONTE_MONTSERRAT_DATA_URI, LOGO_MARINHA_DATA_URI } from './recursosAnexo';
import { CONFIG_EMAIL_RESULTADO } from './resultadoIS';
import {
  assuntoAgendaIS, caminhoPdfAgendaIS, dataBrDeIso, dataIsoValida, dataTituloDeIso, decidirEnvioAutomatico, destinatariosAgendaIS,
  hojeEmRecife, horaDe, type UsuarioParaEmail,
} from '../../utils/emailAgendaIS';

const APP_URL = (process.env.APP_URL || 'https://mauriston.github.io/DoencasEPareceresJRS/').replace(/\/?$/, '/');

export const CONFIG_EMAIL_AGENDA = {
  nomeRemetente: 'JRS/HNRe',
  vocativo: 'Prezados Militares da JRS,',
  fecho: 'ATT/RPT,',
  appImagemUrl: process.env.EMAIL_APP_IMAGEM_URL || `${APP_URL}email/brasao-hnre-app.png`,
};

const COL_REGISTRO = 'emailsAgendaIS';

/** Mínimo do bucket do Storage (firebase-admin) usado aqui. */
export interface BucketPdf { file(caminho: string): { save(dados: Buffer, opcoes: Record<string, unknown>): Promise<unknown> } }

export interface ItemAgenda { hora: string; nome: string; om: string; numero_is: string; finalidade: string; medico: string }
export interface ItemConcurso { concurso: string; matricula: string; candidato: string }
export interface AgendaDoDia { data: string; agendamentos: ItemAgenda[]; concursos: ItemConcurso[] }

const maiusculas = (t: unknown) => String(t ?? '').trim().toLocaleUpperCase('pt-BR');

// ---------------------------------------------------------------- Dados

/** IS com entrevista na data (menos as canceladas), por hora, e candidatos de concurso (Em andamento / Em breve) agendados nela. */
export const coletarAgenda = async (db: Firestore, data: string): Promise<AgendaDoDia> => {
  const snap = await db.collection('inspecoes').where('dataEntrevista', '>=', `${data}T00:00`).where('dataEntrevista', '<=', `${data}T23:59`).get();
  const lista = snap.docs.map(d => d.data() as Record<string, any>).filter(i => i.status !== 'cancelada')
    .sort((a, b) => String(a.dataEntrevista).localeCompare(String(b.dataEntrevista)) || Number(a.is) - Number(b.is));

  const ids = [...new Set(lista.map(i => String(i.inspecionadoId || '')).filter(Boolean))];
  const oms = new Map<string, string>();
  if (ids.length) {
    const docs = await db.getAll(...ids.map(id => db.collection('militares').doc(id)));
    docs.forEach(d => { if (d.exists) oms.set(d.id, String(d.data()?.om || '')); });
  }
  const agendamentos: ItemAgenda[] = lista.map(i => ({
    hora: horaDe(i.dataEntrevista),
    nome: maiusculas(i.inspecionado),
    om: oms.get(String(i.inspecionadoId || '')) || '—',
    numero_is: String(i.is ?? ''),
    finalidade: String(i.finalidade || ''),
    medico: maiusculas(i.peritoNome) || '—',
  }));

  const concursosSnap = await db.collection('concursos').get();
  const ativos = concursosSnap.docs.filter(d => ['em_andamento', 'em_breve'].includes(String(d.data().status || 'em_breve')));
  const concursos: ItemConcurso[] = [];
  for (const c of ativos) {
    const cand = await c.ref.collection('candidatos').where('dataAgendamento', '==', data).get();
    cand.docs.forEach(d => concursos.push({ concurso: String(c.data().nome || ''), matricula: d.id, candidato: maiusculas(d.data().nome) }));
  }
  concursos.sort((a, b) => a.concurso.localeCompare(b.concurso, 'pt-BR') || a.candidato.localeCompare(b.candidato, 'pt-BR'));
  return { data, agendamentos, concursos };
};

// ---------------------------------------------------------------- Montagem

const dadosComuns = (a: AgendaDoDia): DadosTemplate => ({
  data_extenso: dataBrDeIso(a.data),
  data_titulo: dataTituloDeIso(a.data),
  agendamentos: a.agendamentos as unknown as Record<string, unknown>[],
  tem_concursos: a.concursos.length > 0,
  concursos: a.concursos as unknown as Record<string, unknown>[],
});

/** Assunto, HTML (sem JavaScript), texto simples e HTML do anexo. Exportada para os testes. */
export const montarEmailAgenda = (a: AgendaDoDia) => {
  const c = CONFIG_EMAIL_RESULTADO;
  const html = renderizarTemplate(TEMPLATE_AGENDA_IS, {
    ...dadosComuns(a),
    vocativo: CONFIG_EMAIL_AGENDA.vocativo,
    fecho: CONFIG_EMAIL_AGENDA.fecho,
    mostrar_supervisor: true,
    supervisor_nome: c.supervisorNome, supervisor_posto: c.supervisorPosto,
    presidente_nome: c.presidenteNome, presidente_posto: c.presidentePosto,
    banner_url: c.bannerUrl, logo_rodape_url: c.logoRodapeUrl, app_imagem_url: CONFIG_EMAIL_AGENDA.appImagemUrl,
  });
  const htmlAnexo = renderizarTemplate(TEMPLATE_ANEXO_AGENDA_IS, { ...dadosComuns(a), fonte_montserrat: FONTE_MONTSERRAT_DATA_URI, logo_rodape: LOGO_MARINHA_DATA_URI });
  const texto = [
    CONFIG_EMAIL_AGENDA.vocativo, '',
    `INF as Inspeções de Saúde agendadas para ${dataBrDeIso(a.data)}, conforme relação abaixo:`, '',
    `INSPEÇÕES DE SAÚDE · ${dataTituloDeIso(a.data)}`,
    ...(a.agendamentos.length
      ? a.agendamentos.map(i => `${i.hora} · ${i.nome} (${i.om} · ${i.numero_is}) · ${i.finalidade} · ${i.medico}`)
      : ['Não há Inspeções de Saúde agendadas para esta data.']),
    ...(a.concursos.length ? ['', 'INSPEÇÕES DE SAÚDE DE CONCURSOS', ...a.concursos.map(k => `${k.concurso} · ${k.matricula} · ${k.candidato}`)] : []),
    '', `App JRS/HNRe: ${APP_URL}`, '',
    CONFIG_EMAIL_AGENDA.fecho, '',
    c.supervisorNome, c.supervisorPosto, 'Supervisor', '',
    c.presidenteNome, c.presidentePosto, 'Presidente', '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${c.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return { assunto: assuntoAgendaIS(a.data), html, texto, htmlAnexo };
};

// ---------------------------------------------------------------- Envio

export interface ResultadoEnvioAgenda { data: string; para: string[]; cc: string[]; totalIS: number; totalConcursos: number; pdfCaminho: string; reenvio: boolean }

/** Monta, gera o PDF (Storage, sem duplicar), envia e registra o e-mail da agenda de `data`. */
export const enviarAgendaIS = async (db: Firestore, bucket: BucketPdf, data: string, quem: { uid: string; automatico: boolean }): Promise<ResultadoEnvioAgenda> => {
  if (!dataIsoValida(data)) throw new ErroContaGoogle('falha', 'Data inválida (use AAAA-MM-DD).');
  const agenda = await coletarAgenda(db, data);
  const usuarios = (await db.collection('usuarios').get()).docs.map(d => d.data() as UsuarioParaEmail);
  const { para, cc } = destinatariosAgendaIS(usuarios, CONFIG_EMAIL_RESULTADO.emailJrs);
  const { assunto, html, texto, htmlAnexo } = montarEmailAgenda(agenda);

  const pdf = await htmlParaPdf(htmlAnexo);
  const pdfCaminho = caminhoPdfAgendaIS(data);
  // Mesmo caminho a cada envio da data: o reenvio substitui o PDF, não cria outro.
  await bucket.file(pdfCaminho).save(pdf, { contentType: 'application/pdf', resumable: false, metadata: { cacheControl: 'private, no-store' } });

  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, responderPara: CONFIG_EMAIL_RESULTADO.emailJrs,
    assunto, html, texto, nomeRemetente: CONFIG_EMAIL_AGENDA.nomeRemetente,
    anexo: { nome: `IS_AGENDADAS_${dataBrDeIso(data).replace(/\//g, '-')}.pdf`, bytes: pdf },
  });

  const ref = db.collection(COL_REGISTRO).doc(data);
  const reenvio = (await ref.get()).exists;
  await ref.set({
    data, pdfCaminho, para, cc, totalIS: agenda.agendamentos.length, totalConcursos: agenda.concursos.length,
    ultimoEnvioEm: FieldValue.serverTimestamp(), ultimoEnvioPor: quem.uid, envios: FieldValue.increment(1),
    ...(quem.automatico ? { envioAutomaticoEm: FieldValue.serverTimestamp() } : {}),
  }, { merge: true });
  return { data, para, cc, totalIS: agenda.agendamentos.length, totalConcursos: agenda.concursos.length, pdfCaminho, reenvio };
};

/**
 * Envio automático (Cloud Scheduler, 18h em Recife): agenda de amanhã, de domingo a quinta, fora da véspera de
 * feriado e uma vez por data (uma nova tentativa do agendador não repete o e-mail).
 */
export const envioAutomaticoAgendaIS = async (db: Firestore, bucket: BucketPdf, agora: Date = new Date()) => {
  const decisao = decidirEnvioAutomatico(hojeEmRecife(agora));
  if (decisao.enviar === false) return { enviado: false, data: decisao.data, motivo: decisao.motivo };
  const registro = await db.collection(COL_REGISTRO).doc(decisao.data).get();
  if (registro.exists && registro.data()?.envioAutomaticoEm) return { enviado: false, data: decisao.data, motivo: 'O e-mail automático desta data já foi enviado.' };
  const r = await enviarAgendaIS(db, bucket, decisao.data, { uid: 'agendador', automatico: true });
  return { enviado: true, ...r };
};
