// Ficheiro: components/concursos/ModalImportarCsv.tsx
// Importação de um concurso a partir de CSV (Admin).
import React, { useState } from 'react';
import { importarConcursoDeCsv, definirPeriodoAgendamento, type ConcursoRecord } from '@/services/firestoreConcursos';
import { criarEstruturaConcursoNoDrive } from '@/services/driveConcursos';
import { parseChaveData, interpretarCsvCandidatosDataBase, type CandidatoImportadoCsv } from '@/utils/concursosUtils';

// =========================================================================
// MODAL "IMPORTAR CONCURSO (CSV)" — cria um concurso direto de um CSV no
// formato da aba "candidatosDataBase" (uso do Admin, sem mensagem/agendamento)
// =========================================================================

export interface ModalImportarCsvProps {
  onClose: (concursoIdCriado?: string) => void;
}

export const STATUS_IMPORTACAO_OPTIONS: { value: ConcursoRecord['status']; label: string }[] = [
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'em_breve', label: 'Em Breve' },
];

export const ModalImportarCsv: React.FC<ModalImportarCsvProps> = ({ onClose }) => {
  const [nomeConcurso, setNomeConcurso] = useState('');
  const [status, setStatus] = useState<ConcursoRecord['status']>('encerrado');
  const [fileName, setFileName] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoImportadoCsv[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [concursoIdCriado, setConcursoIdCriado] = useState<string | null>(null);

  const handleSelecionarArquivo = async (file: File | null) => {
    setErro(null);
    setCandidatos([]);
    setFileName(file?.name || null);
    if (!file) return;
    try {
      const texto = await file.text();
      const lista = interpretarCsvCandidatosDataBase(texto);
      if (lista.length === 0) throw new Error('Nenhum candidato encontrado no CSV.');
      setCandidatos(lista);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao ler o CSV.');
    }
  };

  const handleImportar = async () => {
    if (!nomeConcurso.trim()) { setErro('Informe o nome do concurso.'); return; }
    if (candidatos.length === 0) { setErro('Selecione um CSV válido com ao menos um candidato.'); return; }
    if ((periodoInicio && !periodoFim) || (!periodoInicio && periodoFim)) {
      setErro('Informe as duas datas do período (início e fim), ou deixe ambas em branco.');
      return;
    }
    setErro(null);
    setProcessando(true);
    try {
      const { concursoId } = await importarConcursoDeCsv(nomeConcurso.trim(), status, candidatos);
      void criarEstruturaConcursoNoDrive({ nome: nomeConcurso.trim(), ano: new Date().getFullYear() });
      if (periodoInicio && periodoFim) {
        await definirPeriodoAgendamento(concursoId, parseChaveData(periodoInicio), parseChaveData(periodoFim));
      }
      setConcursoIdCriado(concursoId);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao importar o concurso.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[22px] text-gold">table_view</span>
            <h3 className="font-heading font-bold text-sm">Importar Concurso (CSV)</h3>
          </div>
          <button onClick={() => onClose(concursoIdCriado || undefined)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {concursoIdCriado ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Concurso "{nomeConcurso}" importado com sucesso ({candidatos.length} candidato(s)).</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoIdCriado)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Ver Concurso</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-3">
                Importa um concurso direto de um CSV no formato da aba "candidatosDataBase" (com a coluna do nome do
                candidato em qualquer posição). Não cria mensagem administrativa — se o concurso ainda terá
                candidatos reagendados pelo app, informe o período de IS abaixo para liberar o calendário de
                reagendamento; deixe em branco se ele não precisa mais ser agendado (normalmente já encerrados).
              </p>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEAM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-base font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Status inicial</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ConcursoRecord['status'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy"
                >
                  {STATUS_IMPORTACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período IS — início (opcional)</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período IS — fim (opcional)</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <p className="text-sm text-ink-3 -mt-2">Informe o período para liberar o calendário de reagendamento (gera os dias úteis automaticamente).</p>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Arquivo CSV</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
                  <span className="material-symbols-outlined text-[32px] text-ink-3">table_view</span>
                  <span className="text-sm font-bold text-ink">{fileName || 'Clique para selecionar o CSV'}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleSelecionarArquivo(e.target.files?.[0] || null)} />
                </label>
                {candidatos.length > 0 && (
                  <p className="text-sm text-green-700 font-bold mt-1.5">{candidatos.length} candidato(s) identificado(s).</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando || candidatos.length === 0}
                  onClick={handleImportar}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Importando...' : 'Importar Concurso'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
