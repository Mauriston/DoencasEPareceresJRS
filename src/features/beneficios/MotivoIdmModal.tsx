// Ficheiro: components/MotivoIdmModal.tsx
// Modal exibido ao marcar um candidato como Insuf. Documental (e ao clicar nas
// Observações de um IDM ainda editável): o usuário marca, num menu suspenso de
// múltipla escolha, os exames/documentos que motivaram a IDM. A lista é a de
// Exames Mínimos da finalidade "Ingresso SAM / SMV (oriundos do meio civil)",
// sem filtro de sexo ou idade. As escolhas viram o texto das Observações.
import React, { useMemo, useState } from 'react';
import examesData from '@/data/anexoOExamesMinimos.json';

interface GrupoFinalidade {
  Finalidades_Inspecao: {
    Finalidade_Inspecao: string;
    Grupos_Exame: { Grupo_Exame: string; Exames: { Exame: string }[] }[];
  }[];
}

const FINALIDADE_IDM = 'Ingresso SAM / SMV (oriundos do meio civil)';
const SEPARADOR = '; ';

const limparNome = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

const GRUPOS_EXAMES: { grupo: string; exames: string[] }[] = (() => {
  const finalidade = (examesData as GrupoFinalidade[])
    .flatMap(g => g.Finalidades_Inspecao)
    .find(f => limparNome(f.Finalidade_Inspecao) === FINALIDADE_IDM);
  return (finalidade?.Grupos_Exame ?? []).map(g => ({ grupo: g.Grupo_Exame, exames: g.Exames.map(e => e.Exame) }));
})();

const TODOS_EXAMES = new Set(GRUPOS_EXAMES.flatMap(g => g.exames));

/** Exames já gravados nas Observações (separados por "; "), para pré-selecionar ao reabrir. */
const examesDasObservacoes = (observacoes: string): string[] =>
  observacoes.split(SEPARADOR).map(s => s.trim()).filter(s => TODOS_EXAMES.has(s));

interface IdmPickerProps {
  candidatoNome: string;
  /** Observações atuais do candidato (usadas para pré-selecionar ao reabrir). */
  observacoesAtuais: string;
  /** Chamado ao confirmar, com o texto a gravar nas Observações. */
  onConfirm: (observacoes: string) => void;
}

/** Texto + menu de múltipla escolha + Confirmar, sem moldura: usado no modal (desktop) e dentro do bottom sheet (mobile). */
export const IdmPicker: React.FC<IdmPickerProps> = ({ candidatoNome, observacoesAtuais, onConfirm }) => {
  const [selecionados, setSelecionados] = useState<string[]>(() => examesDasObservacoes(observacoesAtuais));
  const [aberto, setAberto] = useState(false);

  const alternar = (exame: string) =>
    setSelecionados(prev => (prev.includes(exame) ? prev.filter(e => e !== exame) : [...prev, exame]));

  // Mantém a ordem da lista de exames (não a ordem dos cliques).
  const ordenados = useMemo(
    () => GRUPOS_EXAMES.flatMap(g => g.exames).filter(e => selecionados.includes(e)),
    [selecionados]
  );

  const resumo = ordenados.length === 0
    ? 'Selecione os exames/documentos...'
    : ordenados.length === 1 ? ordenados[0] : `${ordenados.length} itens selecionados`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink leading-relaxed">
        Informe o motivo da insuficiência documental do candidato (a) <strong>{candidatoNome}</strong>
      </p>

      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-left rounded-xl border border-ink-5 bg-white hover:border-navy focus:outline-none focus:border-navy transition-colors"
      >
        <span className={`min-w-0 truncate ${ordenados.length === 0 ? 'text-ink-3' : 'text-navy'}`}>{resumo}</span>
        <span className={`material-symbols-outlined text-[20px] text-ink-3 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}>expand_more</span>
      </button>

      {aberto && (
        <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-line bg-white">
          {GRUPOS_EXAMES.map(g => (
            <div key={g.grupo}>
              <p className="px-4 pt-3 pb-1 text-xs font-bold text-ink-3 uppercase tracking-wider sticky top-0 bg-white">{g.grupo}</p>
              {g.exames.map(exame => {
                const marcado = selecionados.includes(exame);
                return (
                  <label key={exame} className="flex items-start gap-3 px-4 py-2.5 hover:bg-paper cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(exame)}
                      className="mt-0.5 w-4 h-4 accent-navy shrink-0"
                    />
                    <span className={`text-sm leading-snug ${marcado ? 'font-bold text-navy' : 'text-ink'}`}>{exame}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={ordenados.length === 0}
          onClick={() => onConfirm(ordenados.join(SEPARADOR))}
          className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-navy"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
};

interface MotivoIdmModalProps extends IdmPickerProps {
  /** Quando true (primeira marcação como IDM), o modal não tem como ser dispensado. */
  obrigatorio: boolean;
  onClose: () => void;
}

export const MotivoIdmModal: React.FC<MotivoIdmModalProps> = ({ obrigatorio, onClose, ...picker }) => (
  <div
    className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[8vh] animate-fade-in"
    onClick={obrigatorio ? undefined : onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg max-h-[84vh] flex flex-col overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-4 bg-navy text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[20px] text-gold">assignment_late</span>
          <h3 className="font-heading font-bold text-sm">Motivo da IDM</h3>
        </div>
        {!obrigatorio && (
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>
      <div className="p-5 overflow-y-auto">
        <IdmPicker {...picker} />
      </div>
    </div>
  </div>
);
