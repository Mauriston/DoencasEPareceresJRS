// Ficheiro: components/concursos/MenuAcoesConcurso.tsx
// Menu ⋮ de cada concurso (cards e tabela da lista), montado conforme as permissões e o status.
import React from 'react';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { type ConcursoRecord } from '../../services/firestoreConcursos';

export interface ItemMenuAcao {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export interface MenuAcoesConcursoProps {
  status: ConcursoRecord['status'];
  podeAbrirEncerrar: boolean;
  podeGerarMinutaResultados: boolean;
  podeRegistrarMensagemArquivo: boolean;
  podeListarMensagens: boolean;
  podeAdicionarCandidato: boolean;
  podeEnviarExames: boolean;
  podeEncerrar: boolean;
  podeVoltarParaEmBreve: boolean;
  minutaHabilitada: boolean;
  temPeriodoConfigurado: boolean;
  temMensagensRegistradas: boolean;
  /** Perfil Admin: pode editar o período das IS mesmo com o concurso "Em andamento" e já com lançamentos. */
  ehAdmin?: boolean;
  onAbrir: () => void;
  onVoltarParaEmBreve: () => void;
  onEncerrar: () => void;
  onMinutaResultados: () => void;
  onRegistrarMensagem: () => void;
  onListarMensagens: () => void;
  onDefinirPeriodoAgendamento: () => void;
  onAdicionarCandidato: () => void;
  onEnviarExames: () => void;
}

export const construirItensMenuConcurso = ({
  status, podeAbrirEncerrar, podeGerarMinutaResultados, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames,
  podeEncerrar, podeVoltarParaEmBreve, minutaHabilitada, temPeriodoConfigurado, temMensagensRegistradas, ehAdmin = false,
  onAbrir, onVoltarParaEmBreve, onEncerrar, onMinutaResultados, onRegistrarMensagem, onListarMensagens, onDefinirPeriodoAgendamento, onAdicionarCandidato, onEnviarExames,
}: MenuAcoesConcursoProps): ItemMenuAcao[] => {
  const itens: ItemMenuAcao[] = [];
  if (podeAbrirEncerrar && status === 'encerrado') {
    itens.push({ key: 'abrir', label: 'Reabrir concurso', icon: 'play_circle', onClick: onAbrir });
  }
  // Para "Em breve" o card já tem um botão próprio ("Abrir concurso") logo
  // abaixo — o menu de 3 pontos não repete essa ação.
  if (podeAbrirEncerrar && status === 'em_andamento') {
    // Itens sem utilidade no momento (sem lançamento para voltar, ou nem
    // todos finalizados para encerrar) não aparecem — diferente da Minuta
    // Resultados, que continua sendo mostrada desabilitada com o motivo.
    if (podeVoltarParaEmBreve) {
      itens.push({ key: 'em-breve', label: 'Voltar para em breve', icon: 'undo', onClick: onVoltarParaEmBreve });
    }
    if (podeEncerrar) {
      itens.push({ key: 'encerrar', label: 'Encerrar concurso', icon: 'stop_circle', onClick: onEncerrar });
    }
  }
  // Minuta de resultados só aparece com o concurso "Em andamento" — some tanto
  // da tabela quanto do menu de 3 pontos do card quando "Encerrado" (e
  // nunca apareceu quando "Em breve").
  if (podeGerarMinutaResultados && status === 'em_andamento') {
    itens.push({
      key: 'minuta', label: 'Minuta de resultados', icon: 'outgoing_mail', onClick: onMinutaResultados,
      disabled: !minutaHabilitada, title: minutaHabilitada ? undefined : 'Só é possível gerar a minuta quando todos os candidatos estiverem finalizados.',
    });
  }
  // "Editar" (período já configurado) só aparece enquanto o concurso não
  // tiver lançamentos de dados — mudar o período depois disso invalidaria
  // os dados já lançados. "Definir" (primeira vez) não tem essa restrição.
  // Exceção exclusiva do Admin: com o concurso "Em andamento" o período das
  // IS continua editável mesmo após lançamentos (as datas já agendadas dos
  // candidatos são preservadas no calendário — ver definirPeriodoAgendamento).
  const adminEditaEmAndamento = ehAdmin && status === 'em_andamento';
  if ((podeAbrirEncerrar || adminEditaEmAndamento) && status !== 'encerrado' && (!temPeriodoConfigurado || podeVoltarParaEmBreve || adminEditaEmAndamento)) {
    itens.push({
      key: 'periodo-agendamento',
      label: temPeriodoConfigurado ? 'Editar período das IS' : 'Definir período de agendamento',
      icon: temPeriodoConfigurado ? 'edit_calendar' : 'calendar_add_on', onClick: onDefinirPeriodoAgendamento,
    });
  }
  if (podeAdicionarCandidato && (status === 'em_andamento' || status === 'em_breve')) {
    itens.push({ key: 'adicionar-candidato', label: 'Adicionar candidato', icon: 'person_add', onClick: onAdicionarCandidato });
  }
  // Exames do candidato: só enquanto o concurso recebe candidatos (não faz
  // sentido anexar exames a um concurso encerrado).
  if (podeEnviarExames && status === 'em_andamento') {
    itens.push({ key: 'enviar-exames', label: 'Enviar exames', icon: 'lab_profile', onClick: onEnviarExames });
  }
  if (podeRegistrarMensagemArquivo && status !== 'encerrado') {
    itens.push({ key: 'registrar-msg', label: 'Registrar mensagem', icon: 'upload', onClick: onRegistrarMensagem });
  }
  // "Listar Mensagens" não aparece desabilitado: só entra no menu quando já
  // existe pelo menos uma mensagem arquivada para o concurso.
  if (podeListarMensagens && temMensagensRegistradas) {
    itens.push({ key: 'listar-msg', label: 'Listar mensagens', icon: 'stacked_email', onClick: onListarMensagens });
  }
  return itens;
};

/** Itens no formato do MenuAcoes do DS (desabilitado continua visível e anunciado, com a dica do motivo). */
export const itensMenuAcoesConcurso = (props: MenuAcoesConcursoProps): ItemMenu[] =>
  construirItensMenuConcurso(props).map(item => ({
    rotulo: item.label, icone: item.icon, onClick: item.onClick, desabilitado: item.disabled, dica: item.disabled ? item.title : undefined,
  }));

/** Menu ⋮ do concurso (MenuAcoes do DS: portal, teclado, Esc). */
export const MenuAcoesConcurso: React.FC<MenuAcoesConcursoProps & { nome?: string }> = (props) => {
  const { nome } = props;
  const itens = itensMenuAcoesConcurso(props);
  if (itens.length === 0) return null;
  return <MenuAcoes rotulo={nome ? `Ações do concurso ${nome}` : 'Ações do concurso'} itens={itens} size="sm" />;
};
