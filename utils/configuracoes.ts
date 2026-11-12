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

/** Erros que impedem salvar (Reply-To, assinaturas e saudação obrigatórios). */
export type ErrosConfigEmails = Partial<Record<'responderPara' | 'presidenteNome' | 'presidentePosto' | 'supervisorNome' | 'supervisorPosto' | 'supervisorCargo' | 'saudacaoFaltasHNRe', string>>;

export const errosConfigEmails = (c: ConfigEmails): ErrosConfigEmails => {
  const e: ErrosConfigEmails = {};
  if (!emailValidoCfg(c.responderPara)) e.responderPara = 'Informe um e-mail válido.';
  if (!c.assinatura.presidenteNome.trim()) e.presidenteNome = 'Informe o nome do Presidente.';
  if (!c.assinatura.presidentePosto.trim()) e.presidentePosto = 'Informe o posto do Presidente.';
  if (!c.assinatura.supervisorNome.trim()) e.supervisorNome = 'Informe o nome do Supervisor.';
  if (!c.assinatura.supervisorPosto.trim()) e.supervisorPosto = 'Informe o posto/graduação do Supervisor.';
  if (!c.assinatura.supervisorCargo.trim()) e.supervisorCargo = 'Informe o cargo do Supervisor.';
  if (!c.saudacaoFaltasHNRe.trim()) e.saudacaoFaltasHNRe = 'Informe a saudação.';
  return e;
};
