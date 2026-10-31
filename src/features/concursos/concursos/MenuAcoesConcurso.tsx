// Ficheiro: components/concursos/MenuAcoesConcurso.tsx
// Menu ⋮ de cada concurso (cards e tabela da lista), montado conforme as permissões e o status.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type ConcursoRecord } from '@/services/firestoreConcursos';

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
  podeEncerrar, podeVoltarParaEmBreve, minutaHabilitada, temPeriodoConfigurado, temMensagensRegistradas,
  onAbrir, onVoltarParaEmBreve, onEncerrar, onMinutaResultados, onRegistrarMensagem, onListarMensagens, onDefinirPeriodoAgendamento, onAdicionarCandidato, onEnviarExames,
}: MenuAcoesConcursoProps): ItemMenuAcao[] => {
  const itens: ItemMenuAcao[] = [];
  if (podeAbrirEncerrar && status === 'encerrado') {
    itens.push({ key: 'abrir', label: 'Reabrir Concurso', icon: 'play_circle', onClick: onAbrir });
  }
  // Para "Em Breve" o card já tem um botão próprio ("Abrir Concurso") logo
  // abaixo — o menu de 3 pontos não repete essa ação.
  if (podeAbrirEncerrar && status === 'em_andamento') {
    // Itens sem utilidade no momento (sem lançamento para voltar, ou nem
    // todos finalizados para encerrar) não aparecem — diferente da Minuta
    // Resultados, que continua sendo mostrada desabilitada com o motivo.
    if (podeVoltarParaEmBreve) {
      itens.push({ key: 'em-breve', label: 'Em Breve', icon: 'undo', onClick: onVoltarParaEmBreve });
    }
    if (podeEncerrar) {
      itens.push({ key: 'encerrar', label: 'Encerrar Concurso', icon: 'stop_circle', onClick: onEncerrar });
    }
  }
  // Minuta Resultados só aparece com o concurso "Em Andamento" — some tanto
  // da tabela quanto do menu de 3 pontos do card quando "Encerrado" (e
  // nunca apareceu quando "Em Breve").
  if (podeGerarMinutaResultados && status === 'em_andamento') {
    itens.push({
      key: 'minuta', label: 'Minuta Resultados', icon: 'outgoing_mail', onClick: onMinutaResultados,
      disabled: !minutaHabilitada, title: minutaHabilitada ? undefined : 'Só é possível gerar a minuta quando todos os candidatos estiverem finalizados.',
    });
  }
  // "Editar" (período já configurado) só aparece enquanto o concurso não
  // tiver lançamentos de dados — mudar o período depois disso invalidaria
  // os dados já lançados. "Definir" (primeira vez) não tem essa restrição.
  if (podeAbrirEncerrar && status !== 'encerrado' && (!temPeriodoConfigurado || podeVoltarParaEmBreve)) {
    itens.push({
      key: 'periodo-agendamento',
      label: temPeriodoConfigurado ? 'Editar Período de Agendamento' : 'Definir Período de Agendamento',
      icon: temPeriodoConfigurado ? 'edit_calendar' : 'calendar_add_on', onClick: onDefinirPeriodoAgendamento,
    });
  }
  if (podeAdicionarCandidato && (status === 'em_andamento' || status === 'em_breve')) {
    itens.push({ key: 'adicionar-candidato', label: 'Adicionar Candidato', icon: 'person_add', onClick: onAdicionarCandidato });
  }
  // Exames do candidato: só enquanto o concurso recebe candidatos (não faz
  // sentido anexar exames a um concurso encerrado).
  if (podeEnviarExames && status === 'em_andamento') {
    itens.push({ key: 'enviar-exames', label: 'Enviar Exames do Candidato', icon: 'lab_profile', onClick: onEnviarExames });
  }
  if (podeRegistrarMensagemArquivo && status !== 'encerrado') {
    itens.push({ key: 'registrar-msg', label: 'Registrar Mensagem', icon: 'upload', onClick: onRegistrarMensagem });
  }
  // "Listar Mensagens" não aparece desabilitado: só entra no menu quando já
  // existe pelo menos uma mensagem arquivada para o concurso.
  if (podeListarMensagens && temMensagensRegistradas) {
    itens.push({ key: 'listar-msg', label: 'Listar Mensagens', icon: 'stacked_email', onClick: onListarMensagens });
  }
  return itens;
};

export const MenuAcoesConcurso: React.FC<MenuAcoesConcursoProps> = (props) => {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  const itens = construirItensMenuConcurso(props);

  if (itens.length === 0) return null;

  const abrirMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setAberto(true);
  };

  return (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button ref={btnRef} type="button" aria-label="Ações do concurso" aria-haspopup="menu" aria-expanded={aberto} onClick={() => (aberto ? setAberto(false) : abrirMenu())} className="w-11 h-11 -m-2 flex items-center justify-center rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors">
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">more_vert</span>
      </button>
      {aberto && pos && createPortal(
        <>
          {/* Renderizado via portal (fora do card, que tem overflow-hidden para os
              cantos arredondados) e posicionado em "fixed" a partir do botão —
              senão o menu era cortado pela borda do próprio card. */}
          <div className="fixed inset-0 z-dropdown" onClick={() => setAberto(false)} />
          <div
            role="menu" className="fixed w-64 bg-white rounded-xl shadow-xl border border-line p-1.5 z-dropdown animate-fade-in space-y-0.5"
            style={{ top: pos.top, right: pos.right }}
          >
            {itens.map(item => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                title={item.title}
                onClick={() => { setAberto(false); item.onClick(); }}
                role="menuitem" className="w-full text-left px-3 min-h-[44px] rounded-lg text-sm font-semibold text-navy hover:bg-thead flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
