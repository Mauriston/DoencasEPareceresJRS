// Ficheiro: components/SolicitacaoModais.tsx
// Diálogos das Planilhas de Concursos para gerar o "Pedido de Parecer Médico"
// (especialidade por autocomplete + histórico) e a "Solicitação de Exames
// Complementares Periciais" (texto livre). Desktop: modal centralizado;
// mobile: bottom sheet.
import React, { useMemo, useState } from 'react';
import { ESPECIALIDADES_MEDICAS } from '../data/especialidadesMedicas';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Shell: React.FC<{ titulo: string; icone: string; onClose: () => void; children: React.ReactNode }> = ({ titulo, icone, onClose, children }) => (
  <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-end md:items-start justify-center md:p-4 md:pt-[8vh] animate-fade-in" onClick={onClose}>
    <div
      className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg max-h-[92dvh] md:max-h-[84vh] flex flex-col overflow-hidden animate-sheet-up md:animate-none"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-4 bg-[#050F41] text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[20px] text-[#FAB932]">{icone}</span>
          <h3 className="font-heading font-bold text-sm uppercase">{titulo}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div className="p-5 overflow-y-auto space-y-3">{children}</div>
    </div>
  </div>
);

const campoTexto = 'w-full px-4 py-3 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#050F41] transition-colors';
const rotulo = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

const BotaoGerar: React.FC<{ habilitado: boolean; onClick: () => void }> = ({ habilitado, onClick }) => (
  <div className="flex items-center justify-end pt-1">
    <button
      type="button"
      disabled={!habilitado}
      onClick={onClick}
      className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#050F41]"
    >
      Gerar documento
    </button>
  </div>
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
      <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
        Candidato (a) <strong>{candidatoNome}</strong>
      </p>

      <div className="relative">
        <label className={rotulo}>Especialidade</label>
        <input
          type="text"
          value={busca}
          placeholder="Digite para buscar a especialidade..."
          onChange={e => { setBusca(e.target.value); setEspecialidade(''); setAberto(true); }}
          onFocus={() => setAberto(true)}
          className={campoTexto}
          autoComplete="off"
        />
        {aberto && (
          <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {sugestoes.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Nenhuma especialidade encontrada.</p>
            ) : sugestoes.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => escolher(e)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${e === especialidade ? 'font-bold text-[#050F41]' : 'text-gray-700'}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={rotulo}>Histórico</label>
        <textarea
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
      <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
        Candidato (a) <strong>{candidatoNome}</strong>
      </p>

      <div>
        <label className={rotulo}>Exames solicitados</label>
        <textarea
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
