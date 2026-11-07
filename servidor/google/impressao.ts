// Ficheiro: servidor/google/impressao.ts
// "Enviar para impressão" pelo servidor (Gmail API da conta Google da JRS), no lugar do MailApp do Apps
// Script: mesmos destinatários, assuntos, textos (simples e HTML) e anexo. O PDF é lido do Google Drive
// (Drive API, só leitura) e precisa estar sob a pasta permitida (PARECERES ou CONCURSOS), como antes.
import type { Firestore } from 'firebase-admin/firestore';
import { googleFetch, tokenGoogle, ErroContaGoogle } from './contaGoogle';

/** IDs e e-mails (os mesmos do Apps Script; podem ser trocados por variável de ambiente do Cloud Run). */
export const CONFIG_GOOGLE = {
  pastaPareceres: process.env.ID_PASTA_PARECERES || '176YQTOOWXuE78Xul49XYpJsVNyu-eZFi',
  pastaConcursos: process.env.ID_PASTA_RAIZ_CONCURSOS || '1eBTehJDTOPjsgOeP3DjWKbE-iXdIKGos',
  emailImpressao: process.env.EMAIL_IMPRESSAO || 'giorginis@marinha.mil.br',
  copiasImpressao: process.env.EMAILS_COPIA_IMPRESSAO || 'dayvison.rubem@marinha.mil.br,brunelly.cavalcanti@marinha.mil.br',
};

const escHtml = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** Como limparNomeDrive do Apps Script: sem caracteres de controle nem barras, espaços simples. */
export const limparNome = (t: unknown) => String(t ?? '').replace(/[\u0000-\u001f/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
const semAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
/** "Obrigada!" quando quem assina é a 1T Mônica Virgínia; "Obrigado!" para os demais (regra do Apps Script). */
export const agradecimentoDe = (remetente: string) => (/MONICA/.test(semAcentos(remetente).toUpperCase()) ? 'Obrigada!' : 'Obrigado!');

// ---------------------------------------------------------------- Drive

export const idDoDrive = (url: string): string | null => /drive\.google\.com\/file\/d\/([\w-]+)/.exec(url)?.[1] ?? null;

/** Verdadeiro se o arquivo está sob a pasta (sobe pelos "parents" até 8 níveis, como o Apps Script). */
export const estaSobPasta = async (db: Firestore, fileId: string, pastaId: string): Promise<boolean> => {
  let fila = [fileId];
  for (let nivel = 0; nivel < 8 && fila.length; nivel++) {
    const proxima: string[] = [];
    for (const id of fila) {
      const r = await googleFetch(db, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=parents&supportsAllDrives=true`);
      if (!r.ok) continue;
      const pais: string[] = ((await r.json()) as any).parents || [];
      if (pais.includes(pastaId)) return true;
      proxima.push(...pais);
    }
    fila = proxima;
  }
  return false;
};

const baixarDoDrive = async (db: Firestore, fileId: string): Promise<{ nome: string; bytes: Buffer }> => {
  const meta = await googleFetch(db, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType&supportsAllDrives=true`);
  if (!meta.ok) throw new ErroContaGoogle('falha', 'PDF não encontrado no Drive.');
  const { name } = (await meta.json()) as any;
  const r = await googleFetch(db, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
  if (!r.ok) throw new ErroContaGoogle('falha', 'Não foi possível baixar o PDF do Drive.');
  return { nome: String(name || 'documento.pdf'), bytes: Buffer.from(await r.arrayBuffer()) };
};

// ---------------------------------------------------------------- Gmail

const cabecalhoUtf8 = (t: string) => `=?UTF-8?B?${Buffer.from(t, 'utf8').toString('base64')}?=`;
const base64Linhas = (b: Buffer) => b.toString('base64').replace(/.{76}/g, '$&\r\n');

export interface Email { para: string; cc?: string; assunto: string; texto: string; html: string; nomeRemetente: string; anexo?: { nome: string; bytes: Buffer } }

/** Monta a mensagem MIME (texto + HTML + PDF anexo). Exportada para os testes. */
export const montarMime = (e: Email, contaRemetente: string): string => {
  const limite = `jrs_${Date.now().toString(36)}`;
  const alt = `${limite}_alt`;
  const partes = [
    `From: ${cabecalhoUtf8(e.nomeRemetente)} <${contaRemetente}>`,
    `To: ${e.para}`,
    ...(e.cc ? [`Cc: ${e.cc}`] : []),
    `Subject: ${cabecalhoUtf8(e.assunto)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${limite}"`,
    '',
    `--${limite}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    `--${alt}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', base64Linhas(Buffer.from(e.texto, 'utf8')),
    `--${alt}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', base64Linhas(Buffer.from(e.html, 'utf8')),
    `--${alt}--`,
  ];
  if (e.anexo) partes.push(
    `--${limite}`,
    `Content-Type: application/pdf; name="${cabecalhoUtf8(e.anexo.nome)}"`,
    `Content-Disposition: attachment; filename="${cabecalhoUtf8(e.anexo.nome)}"`,
    'Content-Transfer-Encoding: base64', '', base64Linhas(e.anexo.bytes),
  );
  partes.push(`--${limite}--`, '');
  return partes.join('\r\n');
};

export const enviarEmail = async (db: Firestore, e: Email): Promise<void> => {
  const { conta } = await tokenGoogle(db);
  const raw = Buffer.from(montarMime(e, conta || 'me'), 'utf8').toString('base64url');
  await googleFetch(db, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }),
  });
};

const corpoHtml = (miolo: string, fecho: string, remetente: string) =>
  '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222;">' +
  '<p style="font-size: 18px; font-weight: bold; margin: 0 0 16px;">Giorginis,</p>' +
  `<p style="margin: 0 0 16px;">${miolo}</p>` +
  `<p style="margin: 0 0 16px;">${fecho}</p>` +
  `<p style="margin: 0;">${escHtml(remetente)}</p></div>`;

// ---------------------------------------------------------------- Os três e-mails

/** Pedido de Parecer (página Pareceres): PDF sob PARECERES. */
export const enviarParecerImpressao = async (db: Firestore, pdfUrl: string, remetenteBruto: unknown) => {
  const remetente = limparNome(remetenteBruto).slice(0, 80) || 'JRS/HNRe';
  await enviarEmail(db, {
    para: CONFIG_GOOGLE.emailImpressao, cc: CONFIG_GOOGLE.copiasImpressao, assunto: 'POR FAVOR, IMPRIMIR', nomeRemetente: remetente,
    texto: `Giorginis,\n\nPor favor, imprimir este documento em frente e verso colorido.\n\nObrigado!\n\n${remetente}`,
    html: corpoHtml('Por favor, imprimir este documento em <strong>frente e verso colorido</strong>.', 'Obrigado!', remetente),
    anexo: await anexoDoParecer(db, pdfUrl),
  });
};

/** Pedidos antigos ficaram no Firebase Storage (URL com token de download), como aceitava o Apps Script. */
export const URL_STORAGE_LEGADO = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/jrs-app-web\.firebasestorage\.app\//;

const anexoDoParecer = async (db: Firestore, pdfUrl: string): Promise<{ nome: string; bytes: Buffer }> => {
  const url = String(pdfUrl || '').trim();
  const id = idDoDrive(url);
  if (id) {
    if (!(await estaSobPasta(db, id, CONFIG_GOOGLE.pastaPareceres))) throw new ErroContaGoogle('falha', 'O PDF não está na pasta PARECERES.');
    return baixarDoDrive(db, id);
  }
  if (URL_STORAGE_LEGADO.test(url)) {
    const r = await fetch(url);
    if (!r.ok) throw new ErroContaGoogle('falha', 'Não foi possível baixar o PDF do pedido.');
    return { nome: 'PEDIDO_DE_PARECER.pdf', bytes: Buffer.from(await r.arrayBuffer()) };
  }
  throw new ErroContaGoogle('falha', 'Endereço do PDF não reconhecido.');
};

/** Termo de Recurso + Cientificação (candidato INAPTO): PDF sob CONCURSOS. */
export const enviarTermoRecursoImpressao = async (db: Firestore, b: any) => {
  const remetente = limparNome(b.remetente).slice(0, 80) || 'JRS/HNRe';
  const candidato = limparNome(b.candidatoNome).toUpperCase();
  const candidatoId = limparNome(b.candidatoId);
  const nomeConcurso = limparNome(b.nomeConcurso);
  if (!candidato) throw new ErroContaGoogle('falha', '"candidatoNome" é obrigatório.');
  const id = idDoDrive(String(b.pdfUrl || ''));
  if (!id) throw new ErroContaGoogle('falha', 'Endereço do PDF não reconhecido.');
  if (!(await estaSobPasta(db, id, CONFIG_GOOGLE.pastaConcursos))) throw new ErroContaGoogle('falha', 'O PDF não está na pasta CONCURSOS.');
  const agradecimento = agradecimentoDe(remetente);
  const idCandidato = candidatoId ? `${candidatoId} ` : '';
  await enviarEmail(db, {
    para: CONFIG_GOOGLE.emailImpressao, cc: CONFIG_GOOGLE.copiasImpressao, assunto: `TERMO DE RECURSO INAPTIDÃO - ${candidato}`, nomeRemetente: remetente,
    texto: `Giorginis,\n\nSeguem os termos do candidato INAPTO ao ${nomeConcurso} ${idCandidato}${candidato} para impressão e coleta de assinaturas.\n\n${agradecimento}\n\n${remetente}`,
    html: corpoHtml(`Seguem os termos do candidato <strong style="color: #C00000;">INAPTO</strong> ao ${escHtml(nomeConcurso)} <strong>${escHtml(idCandidato + candidato)}</strong> para impressão e coleta de assinaturas.`, agradecimento, remetente),
    anexo: await baixarDoDrive(db, id),
  });
};

/** Solicitação de Parecer ou de Exames dos concursos: PDF sob CONCURSOS. */
export const enviarSolicitacaoConcursoImpressao = async (db: Firestore, b: any) => {
  const remetente = limparNome(b.remetente).slice(0, 80) || 'JRS/HNRe';
  const tipo = b.tipo === 'parecer' ? 'PARECER' : b.tipo === 'exames' ? 'EXAMES' : '';
  if (!tipo) throw new ErroContaGoogle('falha', '"tipo" deve ser "parecer" ou "exames".');
  const id = idDoDrive(String(b.pdfUrl || ''));
  if (!id) throw new ErroContaGoogle('falha', 'Endereço do PDF não reconhecido.');
  if (!(await estaSobPasta(db, id, CONFIG_GOOGLE.pastaConcursos))) throw new ErroContaGoogle('falha', 'O PDF não está na pasta CONCURSOS.');
  const agradecimento = agradecimentoDe(remetente);
  await enviarEmail(db, {
    para: CONFIG_GOOGLE.emailImpressao, cc: CONFIG_GOOGLE.copiasImpressao, assunto: `IMPRIMIR - SOLICITAÇÃO DE ${tipo}`, nomeRemetente: remetente,
    texto: `Giorginis,\n\nPor favor, imprimir apenas na frente e colorido.\n\n${agradecimento}\n\n${remetente}`,
    html: corpoHtml('Por favor, imprimir <strong>apenas na frente e colorido</strong>.', agradecimento, remetente),
    anexo: await baixarDoDrive(db, id),
  });
};
