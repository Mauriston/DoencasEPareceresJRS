// Ficheiro: utils/emailFaltasHNRe.ts
// Regras puras do e-mail "COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE" (servidor/email/faltasHNRe.ts), usadas pelo
// botão de Inspeções de Saúde, pelo card da Início e pelo servidor (testes em utils/__tests__/emailFaltasHNRe.test.ts):
//  - só IS com status "faltou" de inspecionados cuja OM é o HNRe;
//  - pendente enquanto o e-mail não foi enviado para a falta atual: `emailFaltaDataEntrevista` (gravado no envio)
//    diferente da `dataEntrevista` da IS — uma nova falta depois de reagendar volta a ficar pendente.

export interface ISParaFalta {
  status?: string;
  dataEntrevista?: string;
  inspecionadoId?: string;
  emailFaltaDataEntrevista?: string;
}

const semAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** OM do Hospital Naval de Recife ("HNRe", sem distinguir caixa nem acentos). */
export const ehOmHnre = (om: string | undefined | null): boolean => semAcentos(String(om ?? '')).trim().toUpperCase() === 'HNRE';

/** A falta da IS ainda não foi comunicada (a OM é conferida à parte). */
export const faltaSemEmail = (is: ISParaFalta): boolean =>
  is.status === 'faltou' && !!is.dataEntrevista && is.emailFaltaDataEntrevista !== is.dataEntrevista;

/** IS com falta de inspecionados do HNRe ainda sem e-mail, da falta mais antiga para a mais recente. */
export const faltasPendentesHNRe = <T extends ISParaFalta>(inspecoes: T[], omDe: (inspecionadoId: string) => string | undefined): T[] =>
  inspecoes
    .filter(i => faltaSemEmail(i) && ehOmHnre(omDe(String(i.inspecionadoId || ''))))
    .sort((a, b) => String(a.dataEntrevista).localeCompare(String(b.dataEntrevista)));

/**
 * Separa o texto "POSTO NIP NOME" para deixar o nome de guerra em negrito na tabela do e-mail:
 * { antes, guerra, depois }. Sem nome de guerra (ou sem achá-lo no nome), tudo fica em `antes`.
 */
export const separarNomeGuerra = (inspecionado: string, nomeGuerra?: string): { antes: string; guerra: string; depois: string } => {
  const texto = String(inspecionado || '');
  const guerra = String(nomeGuerra || '').trim();
  if (!guerra) return { antes: texto, guerra: '', depois: '' };
  // Normaliza caractere a caractere (mesmo comprimento) para achar a posição no texto original.
  const norm = (t: string) => Array.from(t).map(c => semAcentos(c).toUpperCase() || c).join('');
  const nip = /\d{2}\.\d{4}\.\d{2}/.exec(texto);
  const inicioNome = nip ? nip.index + nip[0].length : 0;
  const alvo = norm(guerra).replace(/\s+/g, ' ');
  const base = norm(texto);
  // Palavra inteira, a partir do nome (depois do NIP).
  let i = base.indexOf(alvo, inicioNome);
  while (i >= 0) {
    const antesOk = i === 0 || /\s/.test(base[i - 1]);
    const depoisOk = i + alvo.length === base.length || /\s/.test(base[i + alvo.length]);
    if (antesOk && depoisOk) return { antes: texto.slice(0, i), guerra: texto.slice(i, i + alvo.length), depois: texto.slice(i + alvo.length) };
    i = base.indexOf(alvo, i + 1);
  }
  return { antes: texto, guerra: '', depois: '' };
};
