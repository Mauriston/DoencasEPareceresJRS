// Ficheiro: components/SolicitacaoModais.tsx
// Diálogos das Planilhas de Concursos para gerar o "Pedido de Parecer Médico"
// (especialidade por autocomplete + histórico) e a "Solicitação de Exames
// Complementares Periciais" (texto livre). Desktop: modal centralizado;
// mobile: bottom sheet.
import React, { useMemo, useState } from 'react';
import { ESPECIALIDADES_MEDICAS } from '../data/especialidadesMedicas';
import { SheetArrastavel } from './ui/SheetArrastavel';
import { AcoesRodape } from './ui/AcoesRodape';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { controlClass } from './ui/Field';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Shell: React.FC<{ titulo: string; icone: string; onClose: () => void; children: React.ReactNode }> = ({ titulo, icone, onClose, children }) => {
  const isDesktop = useIsDesktop();
  return (
  <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-end md:items-start justify-center md:p-4 md:pt-[8vh] animate-fade-in" onClick={onClose}>
    <SheetArrastavel
      onClose={onClose}
      ativo={!isDesktop}
      className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-line w-full max-w-lg max-h-[92dvh] md:max-h-[84vh] flex flex-col overflow-hidden animate-sheet-up md:animate-none"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-4 bg-navy text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[20px] text-gold">{icone}</span>
          <h3 className="text-h3">{titulo}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>
      <div data-sheet-corpo="" className="p-5 overflow-y-auto space-y-4">{children}</div>
    </SheetArrastavel>
  </div>
  );
};

// Campo e rótulo do DS (Field.tsx) — mesmo controle das demais telas (auditoria v3, O2).
const campoTexto = controlClass;
const rotulo = 'block text-xs font-semibold text-ink-3 mb-1';

// Desktop: botão no fim do formulário; mobile: FAB "extended" do sheet.
const BotaoGerar: React.FC<{ habilitado: boolean; onClick: () => void }> = ({ habilitado, onClick }) => (
  <AcoesRodape className="pt-1" acoes={[{ id: 'gerar', rotulo: 'Gerar documento', icone: 'description', onClick, disabled: !habilitado }]} />
);
interface ParecerModalProps {
  candidatoNome: string;
  onGerar: (dados: { especialidade: string; historico: string }) => void;
  onClose: () => void;
}

export const SolicitarParecerModal: React.FC<ParecerModalProps> = ({ candidatoNome, onGerar, onClose }) => {
  const [busca, setBusca] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState('');

  const sugestoes = useMemo(() => {
    const termo = normalizar(busca.trim());
    return termo ? ESPECIALIDADES_MEDICAS.filter(e => normalizar(e).includes(termo)) : ESPECIALIDADES_MEDICAS;
  }, [busca]);

  const escolher = (e: string) => {
    setEspecialidade(e);
    setBusca(e);
    setAberto(false);
  };

  return (
    <Shell titulo="Pedido de Parecer Médico" icone="stethoscope" onClose={onClose}>
      <p className="text-sm text-ink leading-relaxed">
        Candidato (a) <strong>{candidatoNome}</strong>
      </p>

      <div className="relative">
        <label htmlFor="parecer-especialidade" className={rotulo}>Especialidade</label>
        <input
          id="parecer-especialidade"
          type="text"
          value={busca}
          placeholder="Digite para buscar a especialidade..."
          onChange={e => { setBusca(e.target.value); setEspecialidade(''); setAberto(true); }}
          onFocus={() => setAberto(true)}
          className={campoTexto}
          autoComplete="off"
        />
        {aberto && (
          <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
            {sugestoes.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-3">Nenhuma especialidade encontrada.</p>
            ) : sugestoes.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => escolher(e)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-paper focus-visible:bg-paper focus-visible:outline-none ${e === especialidade ? 'font-bold text-navy' : 'text-ink'}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="parecer-historico" className={rotulo}>Histórico</label>
        <textarea
          id="parecer-historico"
          value={historico}
          onChange={e => setHistorico(e.target.value)}
          rows={5}
          placeholder="Histórico clínico/pericial que justifica o pedido de parecer..."
          className={`${campoTexto} resize-y`}
        />
      </div>

      <BotaoGerar habilitado={!!especialidade && !!historico.trim()} onClick={() => onGerar({ especialidade, historico: historico.trim() })} />
    </Shell>
  );
};

interface ExamesModalProps {
  candidatoNome: string;
  onGerar: (dados: { exames: string }) => void;
  onClose: () => void;
}

export const SolicitarExamesModal: React.FC<ExamesModalProps> = ({ candidatoNome, onGerar, onClose }) => {
  const [exames, setExames] = useState('');

  return (
    <Shell titulo="Solicitação de Exames" icone="lab_research" onClose={onClose}>
      <p className="text-sm text-ink leading-relaxed">
        Candidato (a) <strong>{candidatoNome}</strong>
      </p>

      <div>
        <label htmlFor="exames-solicitados" className={rotulo}>Exames solicitados</label>
        <textarea
          id="exames-solicitados"
          value={exames}
          onChange={e => setExames(e.target.value)}
          rows={6}
          placeholder="Um exame por linha..."
          className={`${campoTexto} resize-y`}
        />
      </div>

      <BotaoGerar habilitado={!!exames.trim()} onClick={() => onGerar({ exames: exames.trim() })} />
    </Shell>
  );
};
