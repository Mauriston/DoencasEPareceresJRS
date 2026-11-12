// Ficheiro: servidor/email/inaptosConcurso.ts
// E-mail "{concurso} - Candidatos Inaptos" à Divisão de Apoio aos Concursos da EAMPE, pela Gmail API da conta
// Google da JRS (servidor/google/impressao.ts → enviarEmail). Rota POST /api/email/inaptos-concurso
// { concursoId, candidatoIds } — só Admin e Secretaria. Só concurso Em andamento; só candidatos INAPTO ainda
// não comunicados (utils/emailInaptosConcurso.ts). Grava emailInaptoEnviadoEm/Por em cada candidato enviado.
// Destinatários fixos e Reply-To em config/emails (tipo inaptosConcurso); assinatura dinâmica (comum.ts).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { TEMPLATE_INAPTOS_CONCURSO } from './templateInaptosConcurso';
import { CONFIG_EMAIL_RESULTADO } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { assuntoInaptos, concursoAceitaEmailInaptos, dataBrCurta, inaptoPendente } from '../../utils/emailInaptosConcurso';

export interface CandidatoInapto { matricula: string; candidato: string; dataAgendamento: string }

/** Assunto, HTML (sem JavaScript) e texto simples. Exportada para os testes. */
export const montarEmailInaptos = (nomeConcurso: string, candidatos: CandidatoInapto[], assinatura: DadosAssinatura = assinaturaSemSignatario()) => {
  const c = CONFIG_EMAIL_RESULTADO;
  const linhas = candidatos.map((k, i) => ({
    matricula: k.matricula, candidato: k.candidato, data_is: dataBrCurta(k.dataAgendamento) || '—', fundo: i % 2 ? '#f9f9f9' : '#ffffff',
  }));
  const html = renderizarTemplate(TEMPLATE_INAPTOS_CONCURSO, {
    nome_concurso: nomeConcurso, candidatos: linhas, ...assinatura, banner_url: c.bannerUrl, logo_rodape_url: c.logoRodapeUrl,
  });
  const texto = [
    'Prezados Militares da Divisão de Apoio aos Concursos da EAMPE,', '',
    `Em atenção ao disposto no calendário de eventos do ${nomeConcurso} e visando dar celeridade em eventuais solicitações de recursos administrativos à JSD/COM3ºDN, INF que os candidatos abaixo relacionados foram considerados "INAPTOS PARA INGRESSO NO ${nomeConcurso}":`, '',
    'MATRÍCULA · NOME · DATA IS · ANEXO T',
    ...linhas.map(l => `${l.matricula} · ${l.candidato} · ${l.data_is} · Sim`), '',
    'SOBRE O CONHECIMENTO DE RECURSO',
    'TODOS os candidatos acima receberam as explicações da Inaptidão na IS diretamente de um dos Membros desta JRS, bem como tomaram ciência do direito de requerer recurso de 1ª instância junto à JSD/COM3ºDN e preencheram o Termo de Conhecimento de Recurso constante no Anexo T da DGPM-406 9ª REV MOD 3.', '',
    'À disposição para quaisquer esclarecimentos adicionais.', '',
    assinaturaTexto(assinatura, 'Respeitosamente / Atenciosamente,'), '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${c.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return { assunto: assuntoInaptos(nomeConcurso), html, texto };
};

export const enviarInaptosConcurso = async (db: Firestore, concursoIdBruto: unknown, candidatoIdsBruto: unknown, uid: string): Promise<{ enviados: number; para: string[]; cc: string[] }> => {
  const concursoId = String(concursoIdBruto ?? '').trim();
  if (!concursoId || concursoId.includes('/')) throw new ErroContaGoogle('falha', 'Informe o concurso.');
  const ids = [...new Set((Array.isArray(candidatoIdsBruto) ? candidatoIdsBruto : []).map(x => String(x ?? '').trim()).filter(x => x && !x.includes('/')))];
  if (!ids.length) throw new ErroContaGoogle('falha', 'Selecione ao menos um candidato.');

  const refConcurso = db.collection('concursos').doc(concursoId);
  const concurso = (await refConcurso.get()).data() as { nome?: string; status?: string } | undefined;
  if (!concurso) throw new ErroContaGoogle('falha', 'Concurso não encontrado.');
  if (!concursoAceitaEmailInaptos(concurso.status)) throw new ErroContaGoogle('falha', 'Só é possível enviar os inaptos de concurso Em andamento.');
  const nome = String(concurso.nome || '').trim();

  const refs = ids.map(id => refConcurso.collection('candidatos').doc(id));
  const docs = await db.getAll(...refs);
  const pendentes = docs
    .filter(d => d.exists && inaptoPendente(d.data() as Record<string, unknown>))
    .map(d => ({ ref: d.ref, matricula: d.id, candidato: String(d.data()?.nome || '').trim().toLocaleUpperCase('pt-BR'), dataAgendamento: String(d.data()?.dataAgendamento || '') }))
    .sort((a, b) => a.dataAgendamento.localeCompare(b.dataAgendamento) || a.candidato.localeCompare(b.candidato, 'pt-BR'));
  if (!pendentes.length) throw new ErroContaGoogle('falha', 'Nenhum dos candidatos selecionados está INAPTO com o e-mail pendente.');

  const fixos = await destinatariosFixos(db, 'inaptosConcurso');
  const para = juntarEmails([fixos.para]);
  if (!para.length) throw new ErroContaGoogle('falha', 'Não há destinatário configurado para este e-mail (Configurações).');
  const cc = juntarEmails([fixos.cc], para);
  const cco = juntarEmails([fixos.cco], [...para, ...cc]);
  const { assunto, html, texto } = montarEmailInaptos(nome, pendentes, await assinaturaDe(db, uid, fixos.config));

  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: 'JRS/HNRe',
  });

  const lote = db.batch();
  pendentes.forEach(p => lote.update(p.ref, { emailInaptoEnviadoEm: FieldValue.serverTimestamp(), emailInaptoEnviadoPor: uid }));
  await lote.commit();
  return { enviados: pendentes.length, para, cc };
};
