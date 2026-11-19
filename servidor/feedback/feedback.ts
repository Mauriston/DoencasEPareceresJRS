// Ficheiro: servidor/feedback/feedback.ts
// Feedback do app (Ajuda › Feedback), com o Admin SDK:
//  - criarFeedback (POST /api/feedback): grava feedbacks/{id} (só o Admin lê — firestore.rules) e envia ao usuário
//    o e-mail de agradecimento (remetente "JRS/HNRe", "Prezado {usuário},", assinado só pelo Presidente). O
//    e-mail é best effort: sem a conta Google autorizada, o feedback fica registrado do mesmo jeito.
//  - atualizarFeedback (POST /api/feedback/status, só o Admin): marca Lido (sugestão/elogio) ou Solucionado
//    (problema). Ao marcar um problema como Solucionado pela 1ª vez, envia ao usuário o e-mail de solução com a
//    página, o relato como foi escrito e a data/hora do registro.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MAX_MENSAGEM, PAGINA_GERAL, PARAGRAFO_SOLUCAO, PARAGRAFO_SOLUCAO_FIM, ROTULO_PAGINA_GERAL,
  dataHoraRecife, erroFeedback, paragrafosAgradecimento, rotuloTipo,
  type EntradaFeedback, type ImpactoProblema, type TipoFeedback,
} from '../../utils/feedback';
import { renderizarTemplate } from '../email/template';
import { MOLDURA_FIM, MOLDURA_INICIO, ASSINATURA_DUPLA } from '../email/templateGuiasIS';
import { assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails } from '../email/comum';
import { CONFIG_EMAIL_RESULTADO, emailValido } from '../email/resultadoIS';

export class ErroFeedback extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Remetente dos e-mails de feedback. */
export const REMETENTE_FEEDBACK = 'JRS/HNRe';

const FONTE = "'Carlito','Calibri',Arial,sans-serif";

/** Corpo comum: vocativo, parágrafos e (opcional) o quadro com o relato. */
const TEMPLATE_FEEDBACK = `${MOLDURA_INICIO}
<p style="margin:0 0 25px 0;font-size:17px;font-weight:700">{{vocativo}}</p>
{{#paragrafos}}
<p style="margin:0 0 18px 0;font-size:16px">{{texto}}</p>
{{/paragrafos}}
{{#mostrar_relato}}
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:6px 0 22px 0;border:1px solid #d9dde6;border-radius:6px;font-family:${FONTE}">
<tbody>
<tr><td style="padding:14px 18px 4px 18px;font-size:14px;color:#555555"><strong style="color:#050F41">Página:</strong> {{pagina}}</td></tr>
<tr><td style="padding:4px 18px;font-size:14px;color:#555555"><strong style="color:#050F41">Registrado em:</strong> {{registrado_em}}</td></tr>
<tr><td style="padding:10px 18px 16px 18px;font-size:15px;color:#050F41;white-space:pre-wrap;font-style:italic">“{{relato}}”</td></tr>
</tbody>
</table>
{{/mostrar_relato}}
{{#paragrafos_fim}}
<p style="margin:0 0 18px 0;font-size:16px">{{texto}}</p>
{{/paragrafos_fim}}
${ASSINATURA_DUPLA}
${MOLDURA_FIM}`;

interface MontarEmail {
  nome: string;
  paragrafos: string[];
  relato?: { pagina: string; registradoEm: string; texto: string };
  paragrafosFim?: string[];
  titulo: string;
  presidente: { nome: string; posto: string };
}

/** Monta o HTML e o texto simples de um e-mail de feedback. Exportada para os testes. */
export const montarEmailFeedback = (m: MontarEmail): { html: string; texto: string } => {
  const assinatura = { ...assinaturaSemSignatario(), presidente_nome: m.presidente.nome, presidente_posto: m.presidente.posto };
  const vocativo = `Prezado ${m.nome.trim() || 'usuário'},`;
  const html = renderizarTemplate(TEMPLATE_FEEDBACK, {
    titulo: m.titulo, banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
    vocativo, fecho: 'Atenciosamente,',
    paragrafos: m.paragrafos.map(texto => ({ texto })),
    mostrar_relato: !!m.relato,
    pagina: m.relato?.pagina ?? '', registrado_em: m.relato?.registradoEm ?? '', relato: m.relato?.texto ?? '',
    paragrafos_fim: (m.paragrafosFim ?? []).map(texto => ({ texto })),
    ...assinatura,
  });
  const texto = [
    vocativo, '',
    ...m.paragrafos.flatMap(p => [p, '']),
    ...(m.relato ? [`Página: ${m.relato.pagina}`, `Registrado em: ${m.relato.registradoEm}`, `"${m.relato.texto}"`, ''] : []),
    ...(m.paragrafosFim ?? []).flatMap(p => [p, '']),
    assinaturaTexto(assinatura, 'Atenciosamente,'),
  ].join('\n');
  return { html, texto };
};

type Presidente = { nome: string; posto: string };
const presidenteDe = (config: { assinatura: { presidenteNome: string; presidentePosto: string } }): Presidente =>
  ({ nome: config.assinatura.presidenteNome, posto: config.assinatura.presidentePosto });

/** E-mail de agradecimento (feedbackRecebido) — envio real e teste (servidor/email/teste.ts). */
export const montarEmailFeedbackRecebido = (nome: string, tipo: TipoFeedback, presidente: Presidente) => ({
  assunto: `FEEDBACK DO APP JRS/HNRe — ${rotuloTipo(tipo).toUpperCase()} RECEBIDO`,
  ...montarEmailFeedback({ nome, titulo: 'Feedback recebido', paragrafos: paragrafosAgradecimento(tipo), presidente }),
});

/** E-mail de problema solucionado (feedbackSolucionado) — envio real e teste. */
export const montarEmailFeedbackSolucionado = (nome: string, relato: { pagina: string; registradoEm: string; texto: string }, presidente: Presidente) => ({
  assunto: 'FEEDBACK DO APP JRS/HNRe — PROBLEMA SOLUCIONADO',
  ...montarEmailFeedback({ nome, titulo: 'Problema solucionado', paragrafos: [PARAGRAFO_SOLUCAO], relato, paragrafosFim: [PARAGRAFO_SOLUCAO_FIM], presidente }),
});

type Enviar = (e: { para: string; cc?: string; cco?: string; assunto: string; html: string; texto: string; nomeRemetente: string; responderPara?: string }) => Promise<void>;

/** Destinatários fixos do tipo (Administração › E-mails automáticos) somados ao usuário. */
const comFixos = async (db: Firestore, tipo: 'feedbackRecebido' | 'feedbackSolucionado', para: string) => {
  const fixos = await destinatariosFixos(db, tipo);
  const paraTodos = juntarEmails([para, fixos.para]);
  const cc = juntarEmails([fixos.cc], paraTodos);
  const cco = juntarEmails([fixos.cco], [...paraTodos, ...cc]);
  return { config: fixos.config, destino: { para: paraTodos.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined, responderPara: fixos.responderPara } };
};

const enviarPadrao = (db: Firestore): Enviar => async e => {
  const { enviarEmail } = await import('../google/impressao');
  await enviarEmail(db, e);
};

interface Usuario { usuario?: string; nome?: string; email?: string; gmail?: string; perfil?: string }
const emailDoUsuario = (u: Usuario): string => {
  const e = String(u.email || u.gmail || '').trim().toLowerCase();
  return emailValido(e) ? e : '';
};
const nomeDoUsuario = (u: Usuario): string => String(u.usuario || u.nome || '').trim();

export interface QuemFeedback { uid: string; perfil: string }

export const criarFeedback = async (
  db: Firestore, corpo: Record<string, unknown>, quem: QuemFeedback, enviar: Enviar = enviarPadrao(db),
): Promise<{ id: string; emailEnviado: boolean }> => {
  const tipo = String(corpo.tipo ?? '') as TipoFeedback;
  const entrada: EntradaFeedback = {
    tipo,
    mensagem: String(corpo.mensagem ?? '').trim(),
    ...(tipo === 'problema' ? { pagina: String(corpo.pagina ?? '').trim().slice(0, 60), impacto: String(corpo.impacto ?? '') as ImpactoProblema } : {}),
  };
  const erro = erroFeedback(entrada);
  if (erro) throw new ErroFeedback(400, erro);

  const u = ((await db.collection('usuarios').doc(quem.uid).get()).data() || {}) as Usuario;
  const paginaRotulo = tipo === 'problema'
    ? (entrada.pagina === PAGINA_GERAL ? ROTULO_PAGINA_GERAL : String(corpo.paginaRotulo ?? '').trim().slice(0, 80) || String(entrada.pagina))
    : '';
  const ctx = (corpo.contexto && typeof corpo.contexto === 'object' ? corpo.contexto : {}) as Record<string, unknown>;
  const agora = new Date();
  const ref = db.collection('feedbacks').doc();
  await ref.set({
    tipo, mensagem: entrada.mensagem.slice(0, MAX_MENSAGEM),
    ...(tipo === 'problema' ? { pagina: entrada.pagina, paginaRotulo, impacto: entrada.impacto } : {}),
    uid: quem.uid, perfil: quem.perfil, usuario: nomeDoUsuario(u), email: emailDoUsuario(u),
    contexto: {
      navegador: String(ctx.navegador ?? '').slice(0, 300),
      tela: String(ctx.tela ?? '').slice(0, 40),
      versao: String(ctx.versao ?? '').slice(0, 40),
    },
    criadoEm: FieldValue.serverTimestamp(),
    criadoEmTexto: dataHoraRecife(agora),
    lido: false, solucionado: false,
  });

  let emailEnviado = false;
  const para = emailDoUsuario(u);
  if (para) {
    try {
      const { config, destino } = await comFixos(db, 'feedbackRecebido', para);
      const email = montarEmailFeedbackRecebido(nomeDoUsuario(u), tipo, presidenteDe(config));
      await enviar({ ...destino, assunto: email.assunto, html: email.html, texto: email.texto, nomeRemetente: REMETENTE_FEEDBACK });
      emailEnviado = true;
      await ref.update({ emailRecebidoEnviadoEm: FieldValue.serverTimestamp() });
    } catch { /* best effort: o feedback já está registrado */ }
  }
  return { id: ref.id, emailEnviado };
};

export const atualizarFeedback = async (
  db: Firestore, corpo: Record<string, unknown>, quem: QuemFeedback, enviar: Enviar = enviarPadrao(db),
): Promise<{ emailEnviado: boolean; semEmail?: boolean }> => {
  if (quem.perfil !== 'admin') throw new ErroFeedback(403, 'Só o Admin pode atualizar feedbacks.');
  const id = String(corpo.id ?? '').trim();
  if (!id || id.includes('/')) throw new ErroFeedback(400, 'Feedback inválido.');
  const marcado = corpo.marcado === true;
  const ref = db.collection('feedbacks').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ErroFeedback(404, 'O feedback não foi encontrado.');
  const f = snap.data() as {
    tipo: TipoFeedback; mensagem: string; paginaRotulo?: string; impacto?: string; uid?: string; usuario?: string; email?: string;
    criadoEm?: { toDate?: () => Date }; criadoEmTexto?: string; emailSolucaoEnviadoEm?: unknown;
  };
  const campo = f.tipo === 'problema' ? 'solucionado' : 'lido';
  await ref.update({
    [campo]: marcado,
    [`${campo}Em`]: marcado ? FieldValue.serverTimestamp() : FieldValue.delete(),
    [`${campo}Por`]: marcado ? quem.uid : FieldValue.delete(),
  });
  if (f.tipo !== 'problema' || !marcado || f.emailSolucaoEnviadoEm) return { emailEnviado: false };

  // E-mail de solução: o endereço atual do cadastro (senão, o do registro).
  const u = f.uid ? ((await db.collection('usuarios').doc(f.uid).get()).data() || {}) as Usuario : {};
  const para = emailDoUsuario(u) || (emailValido(String(f.email || '')) ? String(f.email) : '');
  if (!para) return { emailEnviado: false, semEmail: true };
  const { config, destino } = await comFixos(db, 'feedbackSolucionado', para);
  const registradoEm = f.criadoEm?.toDate ? dataHoraRecife(f.criadoEm.toDate()) : String(f.criadoEmTexto || '');
  const email = montarEmailFeedbackSolucionado(nomeDoUsuario(u) || String(f.usuario || ''),
    { pagina: f.paginaRotulo || ROTULO_PAGINA_GERAL, registradoEm, texto: f.mensagem }, presidenteDe(config));
  await enviar({ ...destino, assunto: email.assunto, html: email.html, texto: email.texto, nomeRemetente: REMETENTE_FEEDBACK });
  await ref.update({ emailSolucaoEnviadoEm: FieldValue.serverTimestamp(), emailSolucaoPara: para });
  return { emailEnviado: true };
};

