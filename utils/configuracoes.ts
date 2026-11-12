// Ficheiro: utils/configuracoes.ts
// Regras puras da página Configurações (só Admin): edição das listas de e-mail de config/emails
// (testes em utils/__tests__/configuracoes.test.ts).
import { emailValidoCfg, normalizarLista, type ConfigEmails } from '../config/emails';

/**
 * Acrescenta à lista os e-mails digitados (separados por vírgula, ponto e vírgula ou espaço), em minúsculas e
 * sem repetir. Devolve a lista nova e os trechos inválidos (que ficam no campo para correção).
 */
export const adicionarEmails = (lista: string[], texto: string): { lista: string[]; invalidos: string[] } => {
  const partes = String(texto || '').split(/[\s,;]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
  const validos = partes.filter(emailValidoCfg);
  const invalidos = partes.filter(p => !emailValidoCfg(p));
  return { lista: normalizarLista([...lista, ...validos]), invalidos };
};

export const removerEmail = (lista: string[], email: string): string[] => lista.filter(e => e !== email);

/** Comparação estrutural (para habilitar "Salvar" só com mudanças). */
export const configIgual = (a: ConfigEmails, b: ConfigEmails): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Erros que impedem salvar (Reply-To e assinatura obrigatórios). */
export const errosConfigEmails = (c: ConfigEmails): { responderPara?: string; presidenteNome?: string; presidentePosto?: string } => {
  const e: { responderPara?: string; presidenteNome?: string; presidentePosto?: string } = {};
  if (!emailValidoCfg(c.responderPara)) e.responderPara = 'Informe um e-mail válido.';
  if (!c.assinatura.presidenteNome.trim()) e.presidenteNome = 'Informe o nome do Presidente.';
  if (!c.assinatura.presidentePosto.trim()) e.presidentePosto = 'Informe o posto do Presidente.';
  return e;
};
