// Ficheiro: servidor/email/template.ts
// Subconjunto do Mustache usado pelos templates de e-mail e de anexo em PDF (servidor/email/template*.ts):
// {{nome}} sempre escapado para HTML; seções {{#nome}}…{{/nome}} — booleano (mostra ou não) ou lista
// (repete o miolo para cada item, com os campos do item); e seções invertidas {{^nome}}…{{/nome}}, mostradas
// quando o valor é falso ou a lista está vazia. Sem JavaScript no resultado.

export const escHtml = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

type Valor = string | number | boolean | Record<string, unknown>[] | undefined;
export type DadosTemplate = Record<string, Valor>;

/**
 * Preenche o template: {{nome}} (sempre escapado para HTML) e seções {{#nome}}…{{/nome}} — booleano
 * (mostra ou não) ou lista (repete o miolo para cada item, com os campos do item). Exportada para os testes.
 */
export const renderizarTemplate = (template: string, dados: DadosTemplate): string => {
  const secoes = template.replace(/\{\{([#^])(\w+)\}\}\n?([\s\S]*?)\{\{\/\2\}\}\n?/g, (_m, tipo: string, nome: string, miolo: string) => {
    const v = dados[nome];
    const vazio = Array.isArray(v) ? v.length === 0 : !v;
    if (tipo === '^') return vazio ? renderizarTemplate(miolo, dados) : '';
    if (Array.isArray(v)) return v.map(item => renderizarTemplate(miolo, { ...dados, ...(item as DadosTemplate) })).join('');
    return v ? renderizarTemplate(miolo, dados) : '';
  });
  return secoes.replace(/\{\{(\w+)\}\}/g, (_m, nome: string) => escHtml(dados[nome]));
};
