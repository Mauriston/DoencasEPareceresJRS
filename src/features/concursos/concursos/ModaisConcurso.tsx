// Ficheiro: components/concursos/ModaisConcurso.tsx
// Modais do menu ⋮ de cada concurso: estatísticas (gráfico), arquivar e listar mensagens,
// definir o período de agendamento e adicionar candidato.
import React, { useEffect, useState } from 'react';
import { criarCandidato, listarDatasAgendamento, listarMensagens, arquivarMensagem, definirPeriodoAgendamento, type DataAgendamentoInfo, type MensagemRecord, type EstatisticaConcursoStatus } from '@/services/firestoreConcursos';
import { extrairMensagemComGemini, salvarMensagemNoDrive, type PastaConcurso } from '@/services/driveConcursos';
import { parseChaveData, type CabecalhoMensagem } from '@/utils/concursosUtils';
import { interpretarMensagem } from './compartilhado';

// =========================================================================
// LISTA DE CONCURSOS
// =========================================================================

// -------------------------------------------------------------------------
// Modal do gráfico de barras (clique nos KPIs anuais de Faltas/Inaptos/IDM)
// -------------------------------------------------------------------------
export interface ModalKpiBarChartProps {
  titulo: string;
  corBarra: string;
  itens: EstatisticaConcursoStatus[];
  onSelecionarConcurso: (id: string) => void;
  onClose: () => void;
}

export const ModalKpiBarChart: React.FC<ModalKpiBarChartProps> = ({ titulo, corBarra, itens, onSelecionarConcurso, onClose }) => {
  const max = Math.max(1, ...itens.map(i => i.quantidade));
  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <h3 className="font-heading font-bold text-sm">{titulo} — Top 4 Concursos</h3>
          <button onClick={onClose} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="text-sm text-ink-3 text-center py-6">Nenhuma ocorrência no ano corrente.</p>
          ) : itens.map(item => (
            <button key={item.concursoId} type="button" onClick={() => { onSelecionarConcurso(item.concursoId); onClose(); }} className="w-full text-left group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy group-hover:underline truncate pr-2">{item.concursoNome}</span>
                <span className="text-sm font-black text-ink shrink-0">{item.quantidade}</span>
              </div>
              <div className="h-3 bg-thead rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${(item.quantidade / max) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Registrar Mensagem" — arquiva UMA mensagem qualquer de um concurso
// já existente (reagendamento, resultado de recurso etc.), diferente do
// fluxo que cria um concurso novo a partir da mensagem de apresentação.
// -------------------------------------------------------------------------
export const PROPOSITO_MENSAGEM_OPTIONS = ['Agendamento', 'Reagendamento', 'Solicitação de Reagendamento', 'Resultado de Recurso', 'Outros'];

export interface ModalRegistrarMensagemArquivoProps {
  concursoId: string;
  concursoNome: string;
  concursoAno: number;
  onClose: () => void;
}

export const ModalRegistrarMensagemArquivo: React.FC<ModalRegistrarMensagemArquivoProps> = ({ concursoId, concursoNome, concursoAno, onClose }) => {
  const pastaConcurso: PastaConcurso = { nome: concursoNome, ano: concursoAno };
  const [step, setStep] = useState<'select' | 'processando' | 'revisao' | 'concluido'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cabecalho, setCabecalho] = useState<CabecalhoMensagem | null>(null);
  const [processando, setProcessando] = useState(false);

  const handleProcessar = async () => {
    if (!file) return;
    setErro(null);
    setProcessando(true);
    setStep('processando');
    try {
      const cab = interpretarMensagem(await extrairMensagemComGemini(file)).cabecalho;
      if (!cab.dataHora) {
        throw new Error('Não foi possível localizar o código Data-Hora (ID único) da mensagem no documento.');
      }
      setCabecalho(cab);
      setStep('revisao');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar o documento.');
      setStep('select');
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!cabecalho || !file) return;
    setErro(null);
    setProcessando(true);
    try {
      const fileUrl = await salvarMensagemNoDrive(pastaConcurso, file);
      await arquivarMensagem(concursoId, cabecalho, fileUrl);
      setStep('concluido');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao arquivar a mensagem.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm truncate">Registrar Mensagem</h3>
            <p className="text-xs text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={onClose} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {step === 'select' && (
            <>
              <p className="text-sm text-ink-3">
                Envie o PDF de uma mensagem administrativa referente a este concurso (ex.: solicitação de
                reagendamento, resultado de recurso). Será arquivada com data-hora, remetente e assunto
                identificados automaticamente.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
                <span className="material-symbols-outlined text-[32px] text-ink-3">picture_as_pdf</span>
                <span className="text-sm font-bold text-ink">{file ? file.name : 'Clique para selecionar o PDF'}</span>
                <span className="text-xs text-ink-3">Máx. 15 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={!file || processando} onClick={handleProcessar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">Processar Mensagem</button>
              </div>
            </>
          )}

          {step === 'processando' && (
            <div className="text-center py-8 text-ink-3 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
              <p className="text-sm font-semibold">Transcrevendo o documento...</p>
            </div>
          )}

          {step === 'revisao' && cabecalho && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">Confira os dados extraídos antes de arquivar a mensagem.</div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Data-Hora</label>
                <input type="text" value={cabecalho.dataHora} onChange={e => setCabecalho({ ...cabecalho, dataHora: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-mono text-navy focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Remetente</label>
                <input type="text" value={cabecalho.sender} onChange={e => setCabecalho({ ...cabecalho, sender: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-navy focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Assunto</label>
                <input type="text" value={cabecalho.subject} onChange={e => setCabecalho({ ...cabecalho, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-navy focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Tipo</label>
                <select value={cabecalho.purpose || 'Outros'} onChange={e => setCabecalho({ ...cabecalho, purpose: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy">
                  {PROPOSITO_MENSAGEM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={processando} onClick={handleConfirmar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {processando ? 'Arquivando...' : 'Arquivar Mensagem'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Mensagem arquivada com sucesso.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Listar Mensagens" — mensagens arquivadas de um concurso
// -------------------------------------------------------------------------
export interface ModalListarMensagensProps {
  concursoId: string;
  concursoNome: string;
  onClose: () => void;
}

export const ModalListarMensagens: React.FC<ModalListarMensagensProps> = ({ concursoId, concursoNome, onClose }) => {
  const [mensagens, setMensagens] = useState<MensagemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<MensagemRecord | null>(null);
  const [textoCopiado, setTextoCopiado] = useState(false);

  const handleCopiarTexto = async () => {
    if (!selecionada?.texto) return;
    try {
      await navigator.clipboard.writeText(selecionada.texto);
      setTextoCopiado(true);
      setTimeout(() => setTextoCopiado(false), 2000);
    } catch {
      // Copiar é um atalho de conveniência — falha silenciosa não impede o uso do modal.
    }
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const lista = await listarMensagens(concursoId);
        if (!cancelado) setMensagens(lista);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [concursoId]);

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            {selecionada && (
              <button onClick={() => setSelecionada(null)} className="p-1 rounded-lg hover:bg-white/10 shrink-0">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            )}
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm truncate">Mensagens Arquivadas</h3>
              <p className="text-xs text-white/70 truncate">{concursoNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {selecionada ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy truncate">{selecionada.subject || 'Sem assunto'}</p>
                  <p className="text-sm text-ink-3">{selecionada.sender} — {selecionada.dataHora}</p>
                </div>
                {selecionada.fileUrl && (
                  <a
                    href={selecionada.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center space-x-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Abrir Mensagem</span>
                  </a>
                )}
              </div>
              {selecionada.texto ? (
                <>
                  <div className="w-full max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-paper p-4">
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{selecionada.texto}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCopiarTexto}
                      title="Copiar texto da mensagem"
                      className="p-2 rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">{textoCopiado ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-3 text-center py-8">Texto da mensagem não disponível.</p>
              )}
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-ink-5">mail</span>
              <p className="text-sm font-bold text-ink">Nenhuma mensagem arquivada</p>
            </div>
          ) : (
            <div className="overflow-x-auto scroll-x-visible">
            <table className="w-full min-w-[520px] text-left border-collapse">
              <thead>
                <tr className="bg-paper/80 border-b border-line text-sm font-bold text-navy uppercase tracking-wider">
                  <th className="py-3 px-4">Data-Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Remetente</th>
                  <th className="py-3 px-4">Assunto</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {mensagens.map(m => (
                  <tr key={m.id} onClick={() => setSelecionada(m)} className="hover:bg-paper cursor-pointer transition-colors">
                    <td className="py-3 px-4 font-mono text-ink whitespace-nowrap">{m.dataHora}</td>
                    <td className="py-3 px-4 text-ink font-semibold whitespace-nowrap">{m.proposito || '-'}</td>
                    <td className="py-3 px-4 text-ink font-semibold">{m.sender || '-'}</td>
                    <td className="py-3 px-4 text-ink">{m.subject || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="material-symbols-outlined text-[18px] text-navy" title="Ver mensagem">
                        visibility
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Definir Período de Agendamento" — gera (ou regenera) o calendário de
// dias úteis de um concurso; necessário para concursos importados via CSV,
// que não têm essa subcoleção e por isso não permitem reagendar candidatos.
// -------------------------------------------------------------------------
export interface ModalDefinirPeriodoAgendamentoProps {
  concursoId: string;
  concursoNome: string;
  onClose: (atualizado?: boolean) => void;
}

export const ModalDefinirPeriodoAgendamento: React.FC<ModalDefinirPeriodoAgendamentoProps> = ({ concursoId, concursoNome, onClose }) => {
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const handleConfirmar = async () => {
    if (!periodoInicio || !periodoFim) { setErro('Informe as duas datas do período.'); return; }
    setErro(null);
    setProcessando(true);
    try {
      await definirPeriodoAgendamento(concursoId, parseChaveData(periodoInicio), parseChaveData(periodoFim));
      setConcluido(true);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao definir o período de agendamento.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm truncate">Definir Período de Agendamento</h3>
            <p className="text-xs text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={() => onClose(concluido)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {concluido ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Período definido com sucesso. O calendário de reagendamento já está liberado.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(true)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-3">
                Informe o período das IS deste concurso para gerar os dias úteis disponíveis para reagendamento. Se o
                concurso já tiver um calendário configurado, ele será substituído pelo novo período.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={processando} onClick={handleConfirmar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {processando ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Adicionar Candidato" — inclui manualmente um candidato num
// concurso já Em Andamento ou Em Breve, perguntando a data de agendamento
// dentre as já configuradas (calendário de dias úteis do período).
// -------------------------------------------------------------------------
export interface ModalAdicionarCandidatoProps {
  concursoId: string;
  concursoNome: string;
  onClose: (atualizado?: boolean) => void;
}

export const ModalAdicionarCandidato: React.FC<ModalAdicionarCandidatoProps> = ({ concursoId, concursoNome, onClose }) => {
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [datas, setDatas] = useState<DataAgendamentoInfo[]>([]);
  const [loadingDatas, setLoadingDatas] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoadingDatas(true);
      try {
        const lista = await listarDatasAgendamento(concursoId);
        if (!cancelado) setDatas(lista);
      } finally {
        if (!cancelado) setLoadingDatas(false);
      }
    })();
    return () => { cancelado = true; };
  }, [concursoId]);

  const handleSalvar = async () => {
    if (!matricula.trim() || !nome.trim()) { setErro('Informe a matrícula e o nome do candidato.'); return; }
    setErro(null);
    setSalvando(true);
    try {
      await criarCandidato(concursoId, matricula.trim(), nome.trim().toUpperCase(), dataAgendamento);
      setConcluido(true);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao adicionar o candidato.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm truncate">Adicionar Candidato</h3>
            <p className="text-xs text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={() => onClose(concluido)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {concluido ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Candidato "{nome.trim().toUpperCase()}" adicionado com sucesso.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(true)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Matrícula</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex.: 550039-7"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-mono text-navy focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Nome do candidato</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="NOME COMPLETO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Data de agendamento</label>
                {loadingDatas ? (
                  <p className="text-sm text-ink-3">Carregando datas...</p>
                ) : datas.length === 0 ? (
                  <p className="text-sm text-gold-700">Este concurso ainda não tem datas configuradas — o candidato será adicionado sem agendamento (pode ser agendado depois).</p>
                ) : (
                  <select
                    value={dataAgendamento}
                    onChange={e => setDataAgendamento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-navy focus:outline-none focus:border-navy"
                  >
                    <option value="">Agendar depois</option>
                    {datas.map(d => (
                      <option key={d.data} value={d.data}>{d.dataFormatada} ({d.diaSemana}) — {d.quantidadeAgendados} agendado(s)</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={salvando} onClick={handleSalvar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {salvando ? 'Adicionando...' : 'Adicionar Candidato'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Menu de 3 pontos (ações do concurso) exibido em cada card — a lógica de
// construção dos itens é compartilhada com a coluna "Ações" da visão em
// tabela (ver TabelaConcursos), que reaproveita a mesma habilitação mas
// omite por completo os itens desabilitados.
// -------------------------------------------------------------------------
