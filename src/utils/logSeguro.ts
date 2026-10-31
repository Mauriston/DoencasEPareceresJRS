// Ficheiro: utils/logSeguro.ts
// Log seguro (LGPD, docs/database.md seção 17): nunca registrar corpo de requisição, NIP, nome, CID,
// e-mail, CPF nem tokens. Loga só o contexto fixo, um código e uma mensagem mascarada/truncada.

const PADROES: [RegExp, string][] = [
  [/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, '[token]'],
  [/Bearer\s+[\w.~+/=-]+/gi, 'Bearer [token]'],
  [/([?&](?:key|token|idToken|access_token)=)[^&\s"']+/gi, '$1[oculto]'],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]'],
  [/\b\d{2}\.\d{4}\.\d{2}\b/g, '[nip]'],
  [/\b\d{8}\b/g, '[nip]'],
  [/[A-Za-z0-9+/=_-]{120,}/g, '[dados-longos]'],
];

/** Mascara NIP, CPF, e-mail, tokens e blocos longos (base64) em um texto livre. */
export const mascararSensivel = (texto: unknown): string => {
  let s = typeof texto === 'string' ? texto : texto == null ? '' : String(texto);
  for (const [re, sub] of PADROES) s = s.replace(re, sub);
  return s;
};

export interface ErroSeguro { codigo: string; mensagem: string }

/** Reduz um erro qualquer a { codigo, mensagem } sem corpo/stack e com no máximo `max` caracteres. */
export const descreverErro = (e: unknown, max = 200): ErroSeguro => {
  const x: any = e;
  const codigo = typeof x?.code === 'string' || typeof x?.code === 'number' ? String(x.code) : typeof x?.name === 'string' ? x.name : 'erro';
  const bruta = typeof x?.message === 'string' ? x.message : typeof e === 'string' ? e : '';
  return { codigo: mascararSensivel(codigo).slice(0, 60), mensagem: mascararSensivel(bruta).slice(0, max) };
};

/** console.error com contexto fixo + erro reduzido. Nunca passa o objeto do erro nem dados do usuário. */
export const logErroSeguro = (contexto: string, e: unknown): void => {
  const { codigo, mensagem } = descreverErro(e);
  console.error(`${contexto} [${codigo}] ${mensagem}`);
};
