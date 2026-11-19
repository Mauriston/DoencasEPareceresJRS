// Ficheiro: utils/feedback.ts
// Feedback do app (Ajuda › Feedback): regras puras usadas pela página (components/Feedback.tsx) e pelo servidor
// (servidor/feedback/feedback.ts) — tipos, validação, textos dos e-mails e a data/hora do registro.
//  - Problema: exige a página onde ocorreu (entre as que o usuário acessa) e o impacto; o Admin marca "Solucionado"
//    (o usuário recebe outro e-mail com a página e o relato como foi escrito).
//  - Sugestão / Elogio: o Admin marca "Lido" (sem e-mail).

export type TipoFeedback = 'problema' | 'sugestao' | 'elogio';
export type ImpactoProblema = 'baixo' | 'medio' | 'alto';

export const TIPOS_FEEDBACK: { value: TipoFeedback; label: string; icon: string; dica: string }[] = [
  { value: 'problema', label: 'Problema', icon: 'bug_report', dica: 'Algo não funcionou como deveria.' },
  { value: 'sugestao', label: 'Sugestão', icon: 'lightbulb', dica: 'Uma ideia para melhorar o app.' },
  { value: 'elogio', label: 'Elogio', icon: 'thumb_up', dica: 'Algo que funcionou bem.' },
];

export const IMPACTOS: { value: ImpactoProblema; label: string }[] = [
  { value: 'baixo', label: 'Baixo — incomoda, mas dá para continuar' },
  { value: 'medio', label: 'Médio — atrapalha o trabalho' },
  { value: 'alto', label: 'Alto — impede o trabalho' },
];

export const MIN_MENSAGEM = 10;
export const MAX_MENSAGEM = 3000;
/** Página "geral" (o problema não é de uma página só). */
export const PAGINA_GERAL = 'geral';
export const ROTULO_PAGINA_GERAL = 'Geral / várias páginas';

export const rotuloTipo = (t: TipoFeedback): string => TIPOS_FEEDBACK.find(x => x.value === t)?.label ?? t;
export const rotuloImpacto = (i?: string): string => IMPACTOS.find(x => x.value === i)?.label.split(' — ')[0] ?? '';

export interface EntradaFeedback {
  tipo: TipoFeedback;
  mensagem: string;
  /** Problema: id da página (NavItem) ou PAGINA_GERAL. */
  pagina?: string;
  impacto?: ImpactoProblema;
}

/** Erro de validação (mensagem ao usuário) ou '' quando está tudo certo. */
export const erroFeedback = (e: Partial<EntradaFeedback>): string => {
  if (!e.tipo || !TIPOS_FEEDBACK.some(t => t.value === e.tipo)) return 'Escolha o tipo do feedback.';
  if (e.tipo === 'problema') {
    if (!String(e.pagina ?? '').trim()) return 'Informe a página em que o problema ocorreu.';
    if (!e.impacto || !IMPACTOS.some(i => i.value === e.impacto)) return 'Informe o impacto do problema.';
  }
  const m = String(e.mensagem ?? '').trim();
  if (m.length < MIN_MENSAGEM) return `Descreva com ao menos ${MIN_MENSAGEM} caracteres.`;
  if (m.length > MAX_MENSAGEM) return `Use no máximo ${MAX_MENSAGEM} caracteres.`;
  return '';
};

/** "19/11/2026 às 14:05" (horário de Recife). */
export const dataHoraRecife = (d: Date): string => {
  const p = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const v = (t: string) => p.find(x => x.type === t)?.value ?? '';
  return `${v('day')}/${v('month')}/${v('year')} às ${v('hour')}:${v('minute')}`;
};

/** Situação para a lista do Admin: problema → solucionado; os demais → lido. */
export const feedbackConcluido = (f: { tipo: TipoFeedback; lido?: boolean; solucionado?: boolean }): boolean =>
  f.tipo === 'problema' ? !!f.solucionado : !!f.lido;

/** Parágrafos do e-mail de agradecimento (ao enviar). */
export const paragrafosAgradecimento = (tipo: TipoFeedback): string[] => {
  const base = tipo === 'problema'
    ? 'Agradecemos por relatar o problema encontrado no app da JRS/HNRe. Sua contribuição é muito importante para que o sistema continue confiável para toda a equipe.'
    : tipo === 'sugestao'
      ? 'Agradecemos pela sua sugestão para o app da JRS/HNRe. Ideias como a sua ajudam a tornar o sistema cada vez mais útil para toda a equipe.'
      : 'Agradecemos pelo seu elogio ao app da JRS/HNRe. É muito bom saber que o sistema tem ajudado no seu trabalho.';
  return tipo === 'problema'
    ? [base, 'O problema foi registrado e encaminhado ao desenvolvedor. Assim que for solucionado, o(a) senhor(a) será informado(a) por e-mail.']
    : [base];
};

/** Parágrafo do e-mail de solução (o relato, a página e a data/hora vêm em destaque no e-mail). */
export const PARAGRAFO_SOLUCAO = 'Informamos que o problema relatado abaixo foi solucionado pelo desenvolvedor e a correção já está disponível no app.';
export const PARAGRAFO_SOLUCAO_FIM = 'Agradecemos mais uma vez pela sua contribuição. Caso o problema volte a ocorrer, basta registrar um novo feedback em Ajuda › Feedback.';
