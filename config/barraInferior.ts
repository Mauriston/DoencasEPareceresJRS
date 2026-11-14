// Ficheiro: config/barraInferior.ts
// Destinos da barra inferior do celular (auditoria v3, 4e/M4). Lê a MESMA matriz de páginas da
// sidebar (canAccessPage), em tempo de execução: se o Admin muda a matriz em Usuários, a barra
// muda junto. Ordem fixa — Início · IS · Concursos · Perícias (Mensagens no lugar de Perícias
// para quem não acessa Perícia Menor) —, removidos os que o perfil não acessa; "Menu" (o drawer
// com o resto) é sempre o último e fica a cargo do componente (BarraInferior.tsx).
//  • Concursos só entra com ≥ 1 concurso "Em andamento" (ou enquanto o usuário está em /concursos).
//  • Com menos de 2 páginas de TRABALHO (IS, Concursos, Perícias/Mensagens) — o Médicos Geral —,
//    a barra completa com a página de consulta do perfil (Exames mínimos). A ausência de
//    concurso em andamento não conta: nenhum destino entra para "tapar o buraco".
//  • Rótulos ≤ 10 caracteres a 12 px; o nome completo vai no aria-label.
import type { NavItem } from '../types';
import { canAccessPage } from './permissions';
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

export const destinosBarraInferior = (perfil: string | undefined, { concursoEmAndamento, viewAtual }: Contexto): DestinoBarra[] => {
  const pode = (id: string) => canAccessPage(id, perfil);
  const destinos: DestinoBarra[] = [{ view: 'home', rotulo: 'Início', icone: 'home' }];
  let paginasTrabalho = 0;

  if (pode('inspecoes')) {
    paginasTrabalho++;
    destinos.push({ view: 'inspecoes', rotulo: 'IS', ariaLabel: 'Inspeções de Saúde', icone: 'event_available' });
  }
  if (pode('concursosJRS')) {
    paginasTrabalho++;
    if (concursoEmAndamento || viewAtual === 'concursosJRS') destinos.push({ view: 'concursosJRS', rotulo: 'Concursos', icone: 'fact_check' });
  }
  if (pode('pericia-menor')) {
    paginasTrabalho++;
    const atestados = termosPericia(perfil).pagina === 'Atestados';
    destinos.push(atestados
      ? { view: 'pericia-menor', rotulo: 'Atestados', icone: 'personal_injury' }
      : { view: 'pericia-menor', rotulo: 'Perícias', ariaLabel: 'Perícias Menores', icone: 'personal_injury' });
  } else if (pode('mensagens')) {
    paginasTrabalho++;
    destinos.push({ view: 'mensagens', rotulo: 'Mensagens', icone: 'chat' });
  }
  if (paginasTrabalho < 2 && pode('exames')) {
    destinos.push({ view: 'exames', rotulo: 'Exames', ariaLabel: 'Exames mínimos', icone: 'science' });
  }
  return destinos;
};
