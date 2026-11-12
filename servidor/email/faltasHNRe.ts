// Ficheiro: servidor/email/faltasHNRe.ts
// E-mail "COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE" à Divisão de Pessoal do HNRe (só inspecionados com OM HNRe),
// pela Gmail API da conta Google da JRS. Rota POST /api/email/faltas-hnre { isIds } (Admin e Secretaria).
// O servidor relê cada IS e só envia as faltas ainda pendentes (utils/emailFaltasHNRe.ts); grava em cada IS
// `emailFaltaDataEntrevista` (a falta comunicada) e `emailFaltaEnviadoEm`.
// Destinatários: PARA e CC fixos de config/emails (editáveis em Configurações) + CC com os e-mails cadastrados
// dos inspecionados. Reply-To = caixa da JRS. 1ª assinatura = quem enviou (servidor/email/comum.ts).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { TEMPLATE_FALTAS_HNRE } from './templateFaltasHNRe';
import { CONFIG_EMAIL_RESULTADO, dataNaval } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { ehOmHnre, faltaSemEmail, separarNomeGuerra, type ISParaFalta } from '../../utils/emailFaltasHNRe';

export const ASSUNTO_FALTAS_HNRE = 'COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE';
const NOME_REMETENTE = 'JRS/HNRe';
/** Limite por envio (o diálogo manda as pendentes; acima disso, é engano). */
const MAX_IS = 100;

export interface FaltaParaEmail { numero_is: string; dataEntrevista: string; inspecionado: string; nomeGuerra?: string; finalidade: string }

/** Assunto, HTML (sem JavaScript) e texto simples. Exportada para os testes. */
export const montarEmailFaltas = (faltas: FaltaParaEmail[], assinatura: DadosAssinatura = assinaturaSemSignatario()) => {
  const linhas = faltas.map((f, i) => {
    const m = separarNomeGuerra(f.inspecionado, f.nomeGuerra);
    return {
      fundo: i % 2 === 0 ? '#ffffff' : '#f9f9f9',
      numero_is: f.numero_is,
      data: dataNaval(f.dataEntrevista) || '—',
      militar_antes: m.antes, militar_guerra: m.guerra, militar_depois: m.depois,
      finalidade: f.finalidade || '—',
    };
  });
  const html = renderizarTemplate(TEMPLATE_FALTAS_HNRE, {
    faltas: linhas,
    ...assinatura,
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl,
    logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const texto = [
    'Prezada CT (S) Luciana Madruga e demais Militares da Divisão de Pessoal,', '',
    'Em atenção à alínea a do item 2.3.3 da DGPM-406 9ª REV MOD 3 e no intuito de contribuir na faina dessa Divisão de Pessoal sobre controle dos prazos periciais e de certificação do efetivo comparecimento da Tripulação às IS formalmente agendadas, PTC lista de Militares que faltaram às IS agendadas para as medidas administrativas no que couber:', '',
    'IS · DATA · MILITAR · FINALIDADE',
    ...linhas.map(l => `${l.numero_is} · ${l.data} · ${l.militar_antes}${l.militar_guerra}${l.militar_depois} · ${l.finalidade}`), '',
    'NÃO COMPARECIMENTO ÀS IS AGENDADAS x RDM (alínea e do item 2.3.3. da DGPM-406 9ª REV MOD 3):',
    '"os inspecionados são responsáveis ainda pelo agendamento e comparecimento às JS na data marcada para realização de sua IS, podendo a inobservância de tal orientação ser caracterizada como contravenção disciplinar"', '',
    'À disposição para quaisquer esclarecimentos adicionais.', '',
    assinaturaTexto(assinatura, 'Respeitosamente / Atenciosamente,'), '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return { assunto: ASSUNTO_FALTAS_HNRE, html, texto };
};

/** Envia a comunicação das faltas `isIds` (só as ainda pendentes de inspecionados do HNRe) e registra o envio em cada IS. */
export const enviarFaltasHNRe = async (db: Firestore, isIdsBruto: unknown, uid: string): Promise<{ enviados: number; para: string[]; cc: string[] }> => {
  const ids = Array.from(new Set((Array.isArray(isIdsBruto) ? isIdsBruto : []).map(v => String(v ?? '').replace(/\D/g, '')).filter(Boolean)));
  if (!ids.length) throw new ErroContaGoogle('falha', 'Escolha ao menos uma IS.');
  if (ids.length > MAX_IS) throw new ErroContaGoogle('falha', `No máximo ${MAX_IS} IS por e-mail.`);

  const snaps = await db.getAll(...ids.map(id => db.collection('inspecoes').doc(id)));
  type ISDoc = { id: string; ref: FirebaseFirestore.DocumentReference } & Record<string, any>;
  const iss: ISDoc[] = snaps.filter(s => s.exists).map(s => ({ ...(s.data() as Record<string, any>), id: s.id, ref: s.ref }));
  const militarIds = [...new Set(iss.map(i => String(i.inspecionadoId || '')).filter(Boolean))];
  const militares = new Map<string, Record<string, any>>();
  if (militarIds.length) (await db.getAll(...militarIds.map(id => db.collection('militares').doc(id)))).forEach(d => { if (d.exists) militares.set(d.id, d.data() as Record<string, any>); });

  const pendentes = iss
    .filter(i => faltaSemEmail(i as ISParaFalta) && ehOmHnre(militares.get(String(i.inspecionadoId || ''))?.om))
    .sort((a, b) => String(a.dataEntrevista).localeCompare(String(b.dataEntrevista)) || Number(a.is) - Number(b.is));
  if (!pendentes.length) throw new ErroContaGoogle('falha', 'Nenhuma das IS escolhidas tem falta pendente de comunicação (inspecionados do HNRe).');

  const fixos = await destinatariosFixos(db, 'faltasHNRe');
  const emailsInspecionados = pendentes.map(i => { const m = militares.get(String(i.inspecionadoId || '')); return String(m?.email || m?.emailPessoal || ''); });
  const para = juntarEmails([fixos.para]);
  if (!para.length) throw new ErroContaGoogle('falha', 'Configure ao menos um destinatário (PARA) do e-mail de faltas em Configurações.');
  const cc = juntarEmails([fixos.cc, emailsInspecionados], para);
  const cco = juntarEmails([fixos.cco], [...para, ...cc]);

  const { assunto, html, texto } = montarEmailFaltas(pendentes.map(i => ({
    numero_is: String(i.is ?? i.id),
    dataEntrevista: String(i.dataEntrevista || ''),
    inspecionado: String(i.inspecionado || ''),
    nomeGuerra: militares.get(String(i.inspecionadoId || ''))?.nomeGuerra,
    finalidade: String(i.finalidade || ''),
  })), await assinaturaDe(db, uid, fixos.config));

  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: NOME_REMETENTE,
  });

  const lote = db.batch();
  pendentes.forEach(i => lote.update(i.ref, { emailFaltaDataEntrevista: i.dataEntrevista, emailFaltaEnviadoEm: FieldValue.serverTimestamp() }));
  await lote.commit();
  return { enviados: pendentes.length, para, cc };
};
