import React, { useEffect, useState } from 'react';
import { Header } from './Header';

// URL de implantação (aplicativo da web) do projeto Apps Script
// standalone "CodeConcursos.gs" (código-fonte também versionado neste
// repositório), que expõe a API de candidatos (candidatosDataBase/
// candidatos da planilha "TEMPLATE CONCURSOS") usada por esta tela.
const GAS_URL_CONCURSOS = 'https://script.google.com/macros/s/AKfycbzYl4OP22rwwotNOCx1U8JWwnkuacDUoDWPVvJe1BZHvRAyLHSCIrWJaSbyCML-KlXX/exec';

export type StatusCandidato = '' | 'Pendente' | 'APTO' | 'INAPTO' | 'FALTOU' | 'INSUF DOCUMENTAL';

export interface CandidatoRecord {
  id: string;
  nome: string;
  dataAgendamento: string;
  status: StatusCandidato | string;
  observacoes: string;
  finalizado: boolean;
  recurso: boolean;
  dataLaudo: string;
  laudo: string;
  numTIS: string;
  termoRecursoUrl: string;
}

const STATUS_OPTIONS: { value: StatusCandidato; label: string }[] = [
  { value: '', label: 'Sem status' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'APTO', label: 'Apto' },
  { value: 'INAPTO', label: 'Inapto' },
  { value: 'FALTOU', label: 'Faltou' },
  { value: 'INSUF DOCUMENTAL', label: 'Insuf. Documental' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APTO':
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">APTO</span>;
    case 'INAPTO':
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">INAPTO</span>;
    case 'FALTOU':
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">FALTOU</span>;
    case 'INSUF DOCUMENTAL':
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">INSUF. DOC.</span>;
    case 'Pendente':
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">PENDENTE</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 border-dashed">SEM STATUS</span>;
  }
};

async function chamarApiConcursos<T = any>(action: string, params: Record<string, string> = {}): Promise<T> {
  const q = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${GAS_URL_CONCURSOS}?${q}`);
  const json = await res.json();
  if (!json.sucesso) throw new Error(json.erro || 'Erro desconhecido na API.');
  return json.dados as T;
}

async function chamarApiConcursosPost<T = any>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAS_URL_CONCURSOS, {
    method: 'POST',
    // text/plain evita o preflight CORS (OPTIONS), que o aplicativo da
    // web do Apps Script não trata; o corpo continua sendo JSON válido.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.sucesso) throw new Error(json.erro || 'Erro desconhecido na API.');
  return json.dados as T;
}

export const ConcursosJRS: React.FC = () => {
  const [candidatos, setCandidatos] = useState<CandidatoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const [editingCandidato, setEditingCandidato] = useState<CandidatoRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<CandidatoRecord>>({});
  const [saving, setSaving] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newNome, setNewNome] = useState('');
  const [creating, setCreating] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCandidatos();
  }, []);

  const loadCandidatos = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const dados = await chamarApiConcursos<CandidatoRecord[]>('listarCandidatos');
      setCandidatos(dados || []);
    } catch (e: any) {
      console.error('Erro ao carregar candidatos:', e);
      setLoadError(e?.message || 'Não foi possível carregar os candidatos.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenEdit = (candidato: CandidatoRecord) => {
    setEditingCandidato(candidato);
    setEditForm({ ...candidato });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidato) return;

    const novoStatus = (editForm.status ?? editingCandidato.status) as string;
    const statusMudouParaInapto = novoStatus === 'INAPTO' && editingCandidato.status !== 'INAPTO';

    if (statusMudouParaInapto) {
      const confirmado = window.confirm(
        `Registrar ${editingCandidato.nome} como inapto hoje (${new Date().toLocaleDateString('pt-BR')})?`
      );
      if (!confirmado) {
        setEditForm(prev => ({ ...prev, status: editingCandidato.status }));
        return;
      }
    }

    setSaving(true);
    try {
      const atualizado = await chamarApiConcursosPost<CandidatoRecord>({
        action: 'atualizarCandidato',
        id: editingCandidato.id,
        status: novoStatus,
        observacoes: editForm.observacoes ?? editingCandidato.observacoes,
        numTIS: editForm.numTIS ?? editingCandidato.numTIS,
      });

      setCandidatos(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)));
      showToast(`Dados de ${atualizado.nome} atualizados com sucesso.`);
      setEditingCandidato(null);

      if (statusMudouParaInapto) {
        const gerarTermo = window.confirm(
          `Gerar o termo de Cientificação de Recurso para ${atualizado.nome}?`
        );
        if (gerarTermo) {
          await handleGerarTermo(atualizado.id, atualizado.nome);
        }
      }
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleGerarTermo = async (id: string, nome: string) => {
    try {
      const resultado = await chamarApiConcursosPost<{ candidato: string; url: string }>({
        action: 'gerarTermoRecurso',
        id,
      });
      setCandidatos(prev => prev.map(c => (c.id === id ? { ...c, recurso: true, termoRecursoUrl: resultado.url } : c)));
      showToast(`Termo de Recurso gerado para ${nome}.`);
      window.open(resultado.url, '_blank');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar o Termo de Recurso.');
    }
  };

  const handleCreateCandidato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newNome.trim()) return;

    setCreating(true);
    try {
      const criado = await chamarApiConcursosPost<CandidatoRecord>({
        action: 'criarCandidato',
        id: newId.trim(),
        nome: newNome.trim(),
      });
      setCandidatos(prev => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      showToast(`Candidato ${criado.nome} cadastrado com sucesso.`);
      setShowNewModal(false);
      setNewId('');
      setNewNome('');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao cadastrar candidato.');
    } finally {
      setCreating(false);
    }
  };

  const filteredCandidatos = candidatos.filter(c => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.nome.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ? true :
      statusFilter === 'sem-status' ? !c.status :
      c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalFinalizados = candidatos.filter(c => c.finalizado).length;
  const totalPendentes = candidatos.length - totalFinalizados;
  const totalRecursos = candidatos.filter(c => c.recurso).length;

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title="Concursos" />

      {toastMessage && (
        <div className="fixed top-20 right-4 z-[100] bg-[#050F41] text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border border-white/20 animate-fade-in max-w-[90vw]">
          <span className="material-symbols-outlined text-[18px] text-[#079551] shrink-0">check_circle</span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-6xl mx-auto w-full flex-1 space-y-4">
        {/* TOP BAR: BUSCA, FILTROS E NOVO CANDIDATO */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por matrícula ou nome..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-body rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#050F41] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-[#050F41]"
            >
              <option value="todos">Status: Todos</option>
              <option value="sem-status">Status: Sem status</option>
              {STATUS_OPTIONS.filter(o => o.value).map(o => (
                <option key={o.value} value={o.value}>Status: {o.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Novo Candidato</span>
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-[#050F41] font-heading">{candidatos.length}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-gray-400 bg-gray-50 p-2 rounded-xl">groups</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Finalizados</p>
              <p className="text-xl font-bold text-[#079551] font-heading">{totalFinalizados}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-[#079551] bg-green-50 p-2 rounded-xl">check_circle</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pendentes</p>
              <p className="text-xl font-bold text-blue-700 font-heading">{totalPendentes}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-blue-600 bg-blue-50 p-2 rounded-xl">pending_actions</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recursos</p>
              <p className="text-xl font-bold text-red-600 font-heading">{totalRecursos}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-red-500 bg-red-50 p-2 rounded-xl">gavel</span>
          </div>
        </div>

        {/* TABELA / LISTA DE CANDIDATOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
              <p className="text-xs font-semibold">Carregando candidatos...</p>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-red-400">error</span>
              <p className="text-sm font-bold text-gray-700">Não foi possível carregar os candidatos</p>
              <p className="text-xs text-gray-400 max-w-sm">{loadError}</p>
              <button
                type="button"
                onClick={loadCandidatos}
                className="mt-2 px-4 py-2 bg-[#050F41] text-white rounded-xl text-xs font-bold"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredCandidatos.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-300">person_off</span>
              <p className="text-sm font-bold text-gray-700">Nenhum candidato encontrado</p>
              <p className="text-xs text-gray-400">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Matrícula</th>
                      <th className="py-3.5 px-4">Candidato</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Observações</th>
                      <th className="py-3.5 px-4">Nº TIS</th>
                      <th className="py-3.5 px-4">Data Laudo</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredCandidatos.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#050F41]">{c.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">{c.nome}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>
                        <td className="py-3.5 px-4 text-gray-600 truncate max-w-[220px]" title={c.observacoes}>
                          {c.observacoes || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{c.numTIS || '-'}</td>
                        <td className="py-3.5 px-4 text-gray-600">{c.dataLaudo || '-'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-gray-500 hover:text-[#050F41] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar candidato"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {c.termoRecursoUrl && (
                            <a
                              href={c.termoRecursoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-[#050F41] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer inline-flex"
                              title="Abrir Termo de Recurso"
                            >
                              <span className="material-symbols-outlined text-[18px]">description</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS LIST */}
              <div className="block md:hidden divide-y divide-gray-100">
                {filteredCandidatos.map(c => (
                  <div key={c.id} className="p-4 flex flex-col space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#050F41] font-mono">{c.id}</p>
                        <p className="text-[11px] text-gray-700 font-semibold truncate">{c.nome}</p>
                      </div>
                      <div className="shrink-0">{getStatusBadge(c.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Nº TIS</span>
                        <span className="font-mono font-medium">{c.numTIS || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Data Laudo</span>
                        <span className="font-medium">{c.dataLaudo || '-'}</span>
                      </div>
                      {c.observacoes && (
                        <div className="col-span-2">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Observações</span>
                          <span className="font-medium">{c.observacoes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {c.termoRecursoUrl ? (
                        <a
                          href={c.termoRecursoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-[#050F41] underline flex items-center space-x-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">description</span>
                          <span>Termo de Recurso</span>
                        </a>
                      ) : <span />}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="px-3 py-1.5 bg-[#050F41] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editingCandidato && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="material-symbols-outlined text-[22px] text-[#079551] shrink-0">fact_check</span>
                <h3 className="font-heading font-bold text-sm uppercase truncate">{editingCandidato.nome}</h3>
              </div>
              <button
                onClick={() => setEditingCandidato(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={(editForm.status ?? '') as string}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as StatusCandidato }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {editForm.laudo && (
                  <p className="text-[11px] text-gray-500 mt-1">Laudo: {editForm.laudo}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Nº TIS
                </label>
                <input
                  type="text"
                  value={editForm.numTIS ?? ''}
                  onChange={e => setEditForm(prev => ({ ...prev, numTIS: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-semibold text-gray-800 focus:outline-none focus:border-[#050F41]"
                  placeholder="Nº TIS"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Observações
                </label>
                <textarea
                  value={editForm.observacoes ?? ''}
                  onChange={e => setEditForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#050F41] resize-none"
                  placeholder="Observações do candidato..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCandidato(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1"
                >
                  {saving ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO CANDIDATO */}
      {showNewModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">person_add</span>
                <h3 className="font-heading font-bold text-sm uppercase">Novo Candidato</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCandidato} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Matrícula
                </label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={e => setNewId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                  placeholder="EX.: 108842-0"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newNome}
                  onChange={e => setNewNome(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#050F41]"
                  placeholder="NOME COMPLETO"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1"
                >
                  {creating ? (
                    <span>Cadastrando...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Cadastrar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
