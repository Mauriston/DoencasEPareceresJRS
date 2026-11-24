// Ficheiro: config/barraInferior.ts
// Destinos da barra inferior do celular (auditoria v3, 4e/M4). Lê a MESMA matriz de páginas da
// sidebar (canAccessPage), em tempo de execução: se o Admin muda a matriz em Usuários, a barra
// muda junto. Ordem fixa — Início · Inspeções · Concursos · Perícias (Mensagens no lugar de Perícias
// para quem não acessa Perícia Menor) —, removidos os que o perfil não acessa; "Menu" (o drawer
// com o resto) é sempre o último e fica a cargo do componente (BarraInferior.tsx).
//  • Concursos só entra com ≥ 1 concurso "Em andamento" (ou enquanto o usuário está em /concursos).
//  • Inspecionado só entra enquanto o usuário está na página dos inspecionados (fichas incluídas), antes
//    do Menu: some ao sair, como Concursos sem concurso em andamento.
//  • Outra página aberta por fora da barra: entra como último destino (ativo) enquanto o usuário está nela.
//  • Médicos Geral: Início · Atestados · Escala · Exames (Escala de Serviço na 3ª posição).
//  • Secretaria: o lugar de Perícias/Mensagens é de Exames (Exames mínimos).
//  • Com menos de 2 páginas de TRABALHO (Inspeções, Concursos, Perícias/Mensagens) — o Médicos Geral —,
//    a barra completa com a página de consulta do perfil (Exames mínimos). A ausência de
//    concurso em andamento não conta: nenhum destino entra para "tapar o buraco".
//  • Só o item ativo mostra o rótulo (ao lado do ícone); o nome completo vai no aria-label.
import type { NavItem } from '../types';
import { canAccessPage, PAGE_DEFS } from './permissions';
import { termosPericia } from './termosPericia';

export interface DestinoBarra {
  view: NavItem;
  rotulo: string;
  /** Nome completo para leitores de tela, quando o rótulo é abreviado. */
  ariaLabel?: string;
  icone: string;
}

interface Contexto {
  /** Existe concurso com situação "Em andamento" (decidido na abertura/troca de rota). */
  concursoEmAndamento: boolean;
  /** Página atual: em /concursos o item aparece (ativo) mesmo sem concurso em andamento. */
  viewAtual?: NavItem;
}

export const destinosBarraInferior = (perfil: string | undefined, { concursoEmAndamento, viewAtual: viewDaRota }: Contexto): DestinoBarra[] => {
  const pode = (id: string) => canAccessPage(id, perfil);
  const viewAtual = viewDaRota === 'dgpm406-anexos' ? 'dgpm406' : viewDaRota;
  const destinos: DestinoBarra[] = [{ view: 'home', rotulo: 'Início', icone: 'home' }];
  let paginasTrabalho = 0;

  if (pode('inspecoes')) {
    paginasTrabalho++;
    destinos.push({ view: 'inspecoes', rotulo: 'Inspeções', ariaLabel: 'Inspeções de Saúde', icone: 'event_available' });
  }
  if (pode('concursosJRS')) {
    paginasTrabalho++;
    if (concursoEmAndamento || viewAtual === 'concursosJRS') destinos.push({ view: 'concursosJRS', rotulo: 'Concursos', icone: 'fact_check' });
  }
  const secretaria = perfil === 'user_secretaria';
  if (secretaria && pode('exames')) {
    // Secretaria: o lugar de Perícias/Mensagens é de Exames mínimos.
    destinos.push({ view: 'exames', rotulo: 'Exames', ariaLabel: 'Exames mínimos', icone: 'science' });
  } else if (pode('pericia-menor')) {
    paginasTrabalho++;
    const atestados = termosPericia(perfil).pagina === 'Atestados';
    destinos.push(atestados
      ? { view: 'pericia-menor', rotulo: 'Atestados', icone: 'personal_injury' }
      : { view: 'pericia-menor', rotulo: 'Perícias', ariaLabel: 'Perícias Menores', icone: 'personal_injury' });
  } else if (pode('mensagens')) {
    paginasTrabalho++;
    destinos.push({ view: 'mensagens', rotulo: 'Mensagens', icone: 'chat' });
  }
  if (perfil === 'user_medicos_geral' && pode('escala')) {
    destinos.push({ view: 'escala', rotulo: 'Escala', ariaLabel: 'Escala de Serviço', icone: 'calendar_month' });
  }
  if (paginasTrabalho < 2 && pode('exames') && !destinos.some(d => d.view === 'exames')) {
    destinos.push({ view: 'exames', rotulo: 'Exames', ariaLabel: 'Exames mínimos', icone: 'science' });
  }
  // Qualquer outra página aberta por fora da barra (sidebar, menu, atalhos): entra como último destino, ativa, enquanto
  // o usuário está nela (Inspecionados, Normas, Legislação, Férias…). Some ao sair.
  if (viewAtual && !destinos.some(d => d.view === viewAtual)) {
    const def = PAGE_DEFS.find(p => p.id === viewAtual);
    if (viewAtual === 'militares' && pode('militares')) {
      destinos.push({ view: 'militares', rotulo: 'Inspecionado', ariaLabel: 'Inspecionados', icone: 'groups' });
    } else if (def && pode(def.id)) {
      destinos.push({ view: def.id, rotulo: def.label, ariaLabel: def.label, icone: def.icon });
    }
  }
  return destinos;
};
