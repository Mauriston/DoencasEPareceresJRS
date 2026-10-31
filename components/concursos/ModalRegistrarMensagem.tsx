// Ficheiro: components/concursos/ModalRegistrarMensagem.tsx
// Criação de concurso a partir da mensagem administrativa (PDF): leitura pelo Gemini, revisão dos
// candidatos e agendamento (página /concursos/novo).
import React, { useState } from 'react';
import { Container, PageHeader } from '../ui/Page';
import { criarConcursoDaMensagem, novoConcursoId, listarDatasAgendamento, obterContextoAgendamento, confirmarAgendamento, type DataAgendamentoInfo } from '../../services/firestoreConcursos';
import { extrairMensagemComGemini, salvarMensagemNoDrive } from '../../services/driveConcursos';
import { parseChaveData, type CabecalhoMensagem, type CandidatoBasico } from '../../utils/concursosUtils';
import { interpretarMensagem } from './compartilhado';

// =========================================================================
// MODAL "REGISTRAR MENSAGEM (PDF)" — cria um novo concurso do zero
// =========================================================================

export type UploadStep = 'select' | 'processando' | 'revisao' | 'agendamento' | 'concluido';

export interface ModalRegistrarMensagemProps {
  onClose: (concursoIdCriado?: string) => void;
  isAdmin: boolean;
}

export const ModalRegistrarMensagem: React.FC<ModalRegistrarMensagemProps> = ({ onClose, isAdmin }) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [cabecalho, setCabecalho] = useState<CabecalhoMensagem | null>(null);
  const [nomeConcurso, setNomeConcurso] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [candidatos, setCandidatos] = useState<CandidatoBasico[]>([]);

  const [concursoId, setConcursoId] = useState<string | null>(null);
  const [datasDisponiveis, setDatasDisponiveis] = useState<DataAgendamentoInfo[]>([]);
  const [datasSelecionadas, setDatasSelecionadas] = useState<Set<string>>(new Set());
  const [quantidadePorDia, setQuantidadePorDia] = useState('3');
  const [totalPendentes, setTotalPendentes] = useState(0);
  const [minuta, setMinuta] = useState<string | null>(null);
  const [semPeriodo, setSemPeriodo] = useState(false);
  // Texto transcrito do PDF — mostrado na revisão quando nada foi identificado, para diagnosticar o formato.
  const [textoTranscrito, setTextoTranscrito] = useState('');
  // Mensagem de agendamento (HOSRCF): candidatos agrupados por dia — o concurso já nasce com as datas.
  const [modoAgendamento, setModoAgendamento] = useState(false);

  const [processando, setProcessando] = useState(false);

  const handleProcessar = async () => {
    if (!file) return;
    setErro(null);
    setProcessando(true);
    setStep('processando');
    try {
      const lida = interpretarMensagem(await extrairMensagemComGemini(file));
      setTextoTranscrito(lida.texto);
      if (!lida.cabecalho.dataHora) {
        throw new Error('Não foi possível localizar o código Data-Hora (ID único) da mensagem no documento. Confira o arquivo e tente novamente.');
      }
      setModoAgendamento(lida.modoAgendamento);
      setCabecalho(lida.cabecalho);
      setNomeConcurso(lida.nomeConcurso);
      setCandidatos(lida.candidatos);
      setPeriodoInicio(lida.periodo?.inicio ?? '');
      setPeriodoFim(lida.periodo?.fim ?? '');
      setStep('revisao');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar o documento.');
      setStep('select');
    } finally {
      setProcessando(false);
    }
  };

  const atualizarCandidatoEditavel = (indice: number, campo: 'id' | 'nome' | 'dataAgendamento', valor: string) => {
    setCandidatos(prev => prev.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)));
  };

  const removerCandidatoEditavel = (indice: number) => {
    setCandidatos(prev => prev.filter((_, i) => i !== indice));
  };

  const adicionarCandidatoEditavel = () => {
    setCandidatos(prev => [...prev, { id: '', nome: '' }]);
  };

  const handleConfirmarCriacao = async () => {
    if (!cabecalho) return;
    if (!nomeConcurso.trim()) { setErro('Informe o nome do concurso.'); return; }
    const candidatosValidos = candidatos.filter(c => c.id.trim() && c.nome.trim());
    if (candidatosValidos.length === 0) { setErro('Adicione ao menos um candidato válido (matrícula e nome).'); return; }

    setErro(null);
    setProcessando(true);
    try {
      const periodo = periodoInicio && periodoFim ? { inicio: parseChaveData(periodoInicio), fim: parseChaveData(periodoFim) } : null;
      // O PDF vai para o Drive (CONCURSOS > ano atual > concurso > MENSAGENS; a estrutura de pastas é criada
      // aqui) e o upload é aguardado: o registro da mensagem precisa nascer já com a URL do arquivo.
      const novoId = novoConcursoId();
      const fileUrl = await salvarMensagemNoDrive({ nome: nomeConcurso.trim(), ano: new Date().getFullYear() }, file!);
      // A mensagem que cria o concurso é sempre do tipo "Apresentação",
      // independente do que a heurística de extração tenha identificado.
      await criarConcursoDaMensagem({
        concursoId: novoId,
        nome: nomeConcurso.trim(),
        cabecalho: { ...cabecalho, purpose: modoAgendamento ? 'Agendamento' : 'Apresentação' },
        candidatos: candidatosValidos,
        periodo,
        fileUrl,
      });
      setConcursoId(novoId);

      if (modoAgendamento) {
        // Já agendado pelas datas da mensagem: não há distribuição automática nem minuta.
        setSemPeriodo(!periodo);
        setStep('concluido');
      } else if (periodo) {
        const [contexto, datas] = await Promise.all([obterContextoAgendamento(novoId), listarDatasAgendamento(novoId)]);
        setTotalPendentes(contexto.totalPendentes);
        setDatasDisponiveis(datas);
        setDatasSelecionadas(new Set(datas.map(d => d.data)));
        setStep('agendamento');
      } else {
        setSemPeriodo(true);
        setStep('concluido');
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao criar o concurso.');
    } finally {
      setProcessando(false);
    }
  };

  const toggleData = (dataISO: string) => {
    setDatasSelecionadas(prev => {
      const proximo = new Set(prev);
      if (proximo.has(dataISO)) proximo.delete(dataISO); else proximo.add(dataISO);
      return proximo;
    });
  };

  const todasDatasSelecionadas = datasDisponiveis.length > 0 && datasDisponiveis.every(d => datasSelecionadas.has(d.data));
  const toggleTodasDatas = () => {
    setDatasSelecionadas(todasDatasSelecionadas ? new Set() : new Set(datasDisponiveis.map(d => d.data)));
  };

  const quantidadeCoberta = datasSelecionadas.size * (parseInt(quantidadePorDia, 10) || 0);
  const agendamentoViavel = quantidadeCoberta >= totalPendentes && totalPendentes > 0;

  const handleConfirmarAgendamento = async () => {
    if (!concursoId) return;
    setErro(null);
    setProcessando(true);
    try {
      const resultado = await confirmarAgendamento(concursoId, Array.from(datasSelecionadas), parseInt(quantidadePorDia, 10) || 0);
      setMinuta(resultado.minuta);
      setStep('concluido');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao confirmar o agendamento.');
    } finally {
      setProcessando(false);
    }
  };

  const handleCopiarTexto = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); } catch { /* ignora falha de clipboard */ }
  };

  return (
    <Container size="form" className="py-6 md:py-8 pb-10">
      <PageHeader title="Novo concurso" description="Registre a mensagem em PDF; o concurso nasce com os candidatos identificados." />
      {/* F60: etapas numeradas e escritas — 1 Mensagem · 2 Revisão · 3 Agendamento. */}
      <ol className="flex items-center gap-2 mb-5" aria-label="Etapas do novo concurso">
        {[
          { n: 1, rotulo: 'Mensagem', ativa: step === 'select' || step === 'processando' },
          { n: 2, rotulo: 'Revisão', ativa: step === 'revisao' },
          { n: 3, rotulo: 'Agendamento', ativa: step === 'agendamento' || step === 'concluido' },
        ].map((e, i, arr) => {
          const indiceAtual = arr.findIndex(x => x.ativa);
          const feita = i < indiceAtual;
          return (
            <li key={e.n} className="flex items-center gap-2 flex-1 last:flex-none" aria-current={e.ativa ? 'step' : undefined}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${e.ativa ? 'bg-navy text-white border-navy' : feita ? 'bg-white text-green-700 border-green-700' : 'bg-white text-ink-3 border-line'}`}>
                {feita ? <span className="material-symbols-outlined text-[18px]" aria-label="concluída">check</span> : e.n}
              </span>
              <span className={`text-sm font-semibold ${e.ativa ? 'text-navy' : 'text-ink-3'}`}>{e.rotulo}</span>
              {i < arr.length - 1 && <span className="flex-1 h-px bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <div className="bg-white rounded-xl border border-line">
        <div className="p-5 space-y-4">
          {erro && (
            <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>
          )}

          {step === 'select' && (
            <>
              <p className="text-sm text-ink-3">
                Envie o PDF (ou fotografe/escaneie) da mensagem administrativa de apresentação dos candidatos
                ou a mensagem de agendamento enviada pelo HNRe (candidatos agrupados por dia).
                O texto será transcrito por IA, os candidatos, as datas de agendamento (quando houver) e o período
                da JRS identificados automaticamente — você poderá revisar e corrigir tudo antes de criar o concurso.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
                <span className="material-symbols-outlined text-[32px] text-ink-3">picture_as_pdf</span>
                <span className="text-sm font-bold text-ink">{file ? file.name : 'Clique para selecionar o PDF ou escanear um documento'}</span>
                <span className="text-xs text-ink-3">Máx. 15 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={!file || processando}
                  onClick={handleProcessar}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center space-x-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span>Processar Mensagem</span>
                </button>
              </div>
            </>
          )}

          {step === 'processando' && (
            <div className="text-center py-8 text-ink-3 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
              <p className="text-sm font-semibold">Transcrevendo o documento e identificando os candidatos...</p>
            </div>
          )}

          {step === 'revisao' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                Confira e corrija os dados extraídos antes de criar o concurso — a matrícula de cada candidato precisa estar correta.
              </div>
              {modoAgendamento && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                  <span className="font-bold">Mensagem de agendamento identificada:</span> os candidatos serão criados já agendados nas datas abaixo (ajuste a data de qualquer um, se necessário).
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-base font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período JRS — início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período JRS — fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              {!periodoInicio && (
                <p className="text-sm text-gold-700">Período não identificado automaticamente — informe manualmente para já configurar o agendamento, ou deixe em branco para agendar depois.</p>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider">Candidatos ({candidatos.length})</label>
                  <button type="button" onClick={adicionarCandidatoEditavel} className="text-sm font-bold text-navy flex items-center space-x-1">
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Adicionar</span>
                  </button>
                </div>
                <div className="border border-line rounded-xl divide-y divide-line max-h-64 overflow-y-auto">
                  {candidatos.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 p-2">
                      <input
                        type="text"
                        value={c.id}
                        onChange={e => atualizarCandidatoEditavel(i, 'id', e.target.value)}
                        placeholder="Matrícula"
                        className="w-28 shrink-0 px-2 py-1.5 text-xs font-mono rounded-lg border border-line focus:outline-none focus:border-navy"
                      />
                      <input
                        type="text"
                        value={c.nome}
                        onChange={e => atualizarCandidatoEditavel(i, 'nome', e.target.value)}
                        placeholder="Nome do candidato"
                        className="flex-1 min-w-[140px] px-2 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:border-navy"
                      />
                      {modoAgendamento && (
                        <input
                          type="date"
                          value={c.dataAgendamento || ''}
                          onChange={e => atualizarCandidatoEditavel(i, 'dataAgendamento', e.target.value)}
                          aria-label="Data de agendamento"
                          className="w-[9.5rem] shrink-0 px-2 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:border-navy"
                        />
                      )}
                      <button type="button" onClick={() => removerCandidatoEditavel(i)} className="p-1.5 text-ink-3 hover:text-wine-600 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                  {candidatos.length === 0 && (
                    <div className="py-3 space-y-2">
                      <p className="text-sm text-ink-3 text-center">Nenhum candidato identificado.</p>
                      {textoTranscrito && (
                        <details className="text-xs text-ink-3">
                          <summary className="cursor-pointer font-semibold text-center">Ver texto transcrito do PDF</summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-paper border border-line p-2 font-mono">{textoTranscrito}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando}
                  onClick={handleConfirmarCriacao}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Criando concurso...' : 'Confirmar e Criar Concurso'}
                </button>
              </div>
            </>
          )}

          {step === 'agendamento' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-ink">
                <span className="font-bold">Candidatos a agendar:</span> {totalPendentes}
              </div>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Quantidade de IS por dia</label>
                <input
                  type="number"
                  min={1}
                  value={quantidadePorDia}
                  onChange={e => setQuantidadePorDia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-2">Datas disponíveis (marque as que serão usadas)</label>
                <div className="border border-line rounded-xl divide-y divide-line max-h-56 overflow-y-auto">
                  {datasDisponiveis.length > 0 && (
                    <label className="flex items-center gap-2 p-2 text-sm font-bold text-navy cursor-pointer hover:bg-paper bg-paper/60">
                      <input
                        type="checkbox"
                        checked={todasDatasSelecionadas}
                        ref={el => { if (el) el.indeterminate = !todasDatasSelecionadas && datasSelecionadas.size > 0; }}
                        onChange={toggleTodasDatas}
                        className="accent-navy"
                      />
                      <span>{todasDatasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}</span>
                    </label>
                  )}
                  {datasDisponiveis.map(d => (
                    <label key={d.data} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-paper">
                      <input type="checkbox" checked={datasSelecionadas.has(d.data)} onChange={() => toggleData(d.data)} className="accent-navy" />
                      <span className="font-bold text-navy">{d.dataFormatada}</span>
                      <span className="text-ink-3">({d.diaSemana})</span>
                    </label>
                  ))}
                  {datasDisponiveis.length === 0 && <p className="text-sm text-ink-3 text-center py-4">Nenhuma data útil no período informado.</p>}
                </div>
              </div>

              <div className={`rounded-xl p-3 text-sm font-bold ${agendamentoViavel ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gold-50 border border-gold-200 text-gold-800'}`}>
                {quantidadeCoberta} / {totalPendentes} candidatos cobertos com {datasSelecionadas.size} data(s) × {quantidadePorDia || 0} por dia
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Agendar Depois</button>
                <button
                  type="button"
                  disabled={!agendamentoViavel || processando}
                  onClick={handleConfirmarAgendamento}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Confirmando...' : 'Confirmar Agendamento e Gerar Minuta'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">
                  Concurso "{nomeConcurso}" criado com sucesso{modoAgendamento ? ` com os ${candidatos.filter(c => c.id.trim() && c.nome.trim()).length} candidatos já agendados nas datas da mensagem${semPeriodo ? ' (defina o período de agendamento depois, se precisar reagendar).' : '.'}` : semPeriodo ? '.' : ' e agendamento confirmado.'}
                </p>
              </div>
              {minuta && (
                <>
                  <textarea readOnly value={minuta} rows={12} className="w-full px-3.5 py-2.5 rounded-lg border border-ink-5 text-sm font-mono text-navy focus:outline-none resize-none whitespace-pre-wrap" />
                  <button type="button" onClick={() => handleCopiarTexto(minuta)} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                </>
              )}
              {!isAdmin && (
                <p className="text-sm text-ink-3">O concurso ficará com status "Em Breve" até um Admin abri-lo.</p>
              )}
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  );
};
