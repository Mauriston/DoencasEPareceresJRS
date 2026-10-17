// Ficheiro: components/Pareceres.tsx
// Pedido de parecer por especialidade. Auditoria F24/F25/F27: validação inline
// (sem modal de erro), avisos em Toast, busca por nome e ajuda inline, página de
// resultado com as ações do PDF, um único diálogo de confirmação e barra de
// ações fixa. A lógica de montagem do "inspecionado"/PGQ e o payload do GAS
// seguem idênticos.
import React, { useState, useEffect, useMemo } from 'react';
import { Container, PageHeader } from './ui/Page';
import { useQueryParam } from '../hooks/useQueryParam';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { Field, controlClass } from './ui/Field';
import { ChoiceGroup } from './ui/ChoiceGroup';
import { ConfirmDialog } from './ui/Dialog';
import { Toast } from './ui/Toast';
import { EmptyState } from './ui/EmptyState';
import { extrairNomeInspecionado } from '../utils/format';
import { GAS_URL } from '../config/endpoints';

const PERITOS = {
  CT_MAURISTON: { perito: 'CT MAURISTON', nomePerito: 'MAURISTON RENAN MARTINS SILVA', posto: 'Capitão-Tenente (Md)', cargo: 'Presidente', email: 'mauriston.martins@marinha.mil.br' },
  CT_JULIO: { perito: 'CT JÚLIO CÉSAR', nomePerito: 'JÚLIO CÉSAR XAVIER FILHO', posto: 'Capitão-Tenente (RM2-Md)', cargo: 'Membro', email: 'julio.xavier@marinha.mil.br' },
};
const FINALIDADES = ['Verificação de Deficiência Funcional', 'Término de Incapacidade', 'Término de Restrições', 'Missão no exterior (> 3m)', 'Deixar o SMV', 'Deixar o SAM', 'Engajamento', 'Reengajamento'];
const ESPECIALIDADES = ['CARDIOLOGIA', 'HEPATOLOGIA', 'NEUROLOGIA', 'ONCOLOGIA', 'PSICOLOGIA', 'PSIQUIATRIA'];
const PG_OPTIONS = ['CMG', 'CF', 'CC', 'CT', '1T', '2T', 'GM', 'SO', '1SG', '2SG', '3SG', 'CB', 'MN', 'MN-RC', 'SD', 'GR', 'ALUNO', 'SCNS'];
const QUADROS = ['AA', 'AFN', 'CA', 'CD', 'CN', 'EN', 'FN', 'IM', 'Md', 'QC-CA', 'QC-FN', 'QC-IM', 'S', 'T'];
const ESP_PRACAS = ['AD', 'AH', 'AM', 'AR', 'MC', 'MT', 'AT', 'AV', 'BA', 'CA', 'CP', 'CI', 'CN', 'CL', 'CT', 'CO', 'DA', 'DM', 'DT', 'ED', 'EP', 'EL', 'ET', 'TE', 'EF', 'EG', 'ES', 'AE', 'EN', 'FR', 'GC', 'GR', 'HN', 'HD', 'IF', 'MR', 'MA', 'NA', 'MI', 'MG', 'ML', 'ME', 'MO', 'MS', 'MU', 'ND', 'OR', 'OS', 'PL', 'PC', 'PD', 'PT', 'QI', 'RM', 'RB', 'SC', 'SI', 'TC'];

type Erros = Record<string, string>;

export const Pareceres: React.FC = () => {
  // A aba é um nível da URL (?aba=historico).
  const [abaParam, setAbaParam] = useQueryParam('aba');
  const activeTab: 'novo' | 'historico' = abaParam === 'historico' ? 'historico' : 'novo';
  const setActiveTab = (tab: 'novo' | 'historico') => setAbaParam(tab === 'novo' ? null : tab, { replace: true });

  const [peritoSelecionado, setPeritoSelecionado] = useState<'' | 'MAURISTON' | 'JULIO'>('');
  const [finalidade, setFinalidade] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [historico, setHistorico] = useState('');
  const [nip, setNip] = useState('');
  const [militarStatus, setMilitarStatus] = useState<'' | 'loading' | 'found' | 'not_found'>('');
  const [inspecionado, setInspecionado] = useState('');
  const [omLeitura, setOmLeitura] = useState('');
  const [om, setOm] = useState('');
  const [pg, setPg] = useState('');
  const [circulo, setCirculo] = useState('');
  const [quadro, setQuadro] = useState('');
  const [espPraca, setEspPraca] = useState('');
  const [nome, setNome] = useState('');
  const [situacao, setSituacao] = useState<'' | 'Carreira' | 'Temporário'>('');
  const [omsOptions, setOmsOptions] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  const [successPdfId, setSuccessPdfId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  // Busca por nome (inline, abaixo do NIP)
  const [buscaNomeAberta, setBuscaNomeAberta] = useState(false);
  const [pesquisarNomeTerm, setPesquisarNomeTerm] = useState('');
  const [militaresInfoList, setMilitaresInfoList] = useState<{ nome: string; nip: string }[]>([]);
  const [isCarregandoMilitares, setIsCarregandoMilitares] = useState(false);

  // Histórico
  const [pareceresHistory, setPareceresHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyEspFilter, setHistoryEspFilter] = useState('');
  const [sortCol, setSortCol] = useState<'data' | 'inspecionado'>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const avisar = (msg: string, tone: 'success' | 'error' = 'error') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 5000);
  };

  const fetchHistory = async () => {
    if (pareceresHistory.length > 0) return;
    setIsFetchingHistory(true);
    try {
      const resp = await fetch(`${GAS_URL}?action=getPareceresList`);
      const json = await resp.json();
      if (json.success && json.data) setPareceresHistory(json.data);
    } catch (err) { console.error(err); avisar('Erro ao buscar histórico.'); }
    finally { setIsFetchingHistory(false); }
  };

  // Abrir direto em ?aba=historico (deep link) também carrega o histórico.
  useEffect(() => { if (activeTab === 'historico') fetchHistory(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 6) value = `${value.slice(0, 2)}.${value.slice(2, 6)}.${value.slice(6)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}.${value.slice(2)}`;
    setNip(value);
    setErros(er => ({ ...er, nip: '' }));
    if (value.length === 10) searchNip(value);
    else setMilitarStatus('');
  };

  const searchNip = async (nipBusca: string) => {
    setMilitarStatus('loading');
    try {
      const resp = await fetch(`${GAS_URL}?action=getMilitar&nip=${nipBusca}`);
      const data = await resp.json();
      if (data.success) { setInspecionado(data.data.INSPECIONADO); setOmLeitura(data.data.OM); setMilitarStatus('found'); }
      else setMilitarStatus('not_found');
    } catch (err) { console.error(err); setMilitarStatus('not_found'); }
  };

  const alternarBuscaNome = async () => {
    const abrir = !buscaNomeAberta;
    setBuscaNomeAberta(abrir);
    setPesquisarNomeTerm('');
    if (abrir && militaresInfoList.length === 0) {
      setIsCarregandoMilitares(true);
      try {
        const resp = await fetch(`${GAS_URL}?action=getMilitaresList`);
        const data = await resp.json();
        if (data.success && data.data) setMilitaresInfoList(data.data);
      } catch (err) { console.error(err); avisar('Não foi possível carregar a base de militares.'); }
      finally { setIsCarregandoMilitares(false); }
    }
  };

  const selecionarNomeNip = (selectedNip: string) => {
    setNip(selectedNip);
    setErros(er => ({ ...er, nip: '' }));
    setBuscaNomeAberta(false);
    searchNip(selectedNip);
  };

  const resultadosNome = useMemo(() => {
    const termo = pesquisarNomeTerm.trim().toLowerCase();
    if (!termo) return [];
    return militaresInfoList.filter(m => m.nome.toLowerCase().includes(termo));
  }, [militaresInfoList, pesquisarNomeTerm]);

  useEffect(() => {
    fetch(`${GAS_URL}?action=getLookups`).then(res => res.json()).then(data => {
      if (data.success && data.data && data.data.OM) setOmsOptions(data.data.OM.filter((o: string) => o.trim() !== ''));
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (militarStatus !== 'not_found' || !pg) return;
    if (['CMG', 'CF', 'SO', '1SG', '2SG'].includes(pg)) setSituacao('Carreira');
    else if (['2T', 'GM'].includes(pg)) setSituacao('Temporário');
    else setSituacao('');
    if (['CMG', 'CF', 'CC', 'CT', '1T', '2T', 'GM'].includes(pg)) setCirculo('Oficial');
    else if (['SO', '1SG', '2SG', '3SG', 'CB', 'MN', 'MN-RC', 'SD', 'GR'].includes(pg)) setCirculo('Praça');
    else setCirculo('');
  }, [pg, militarStatus]);

  const generateInspecionado = () => {
    if (militarStatus === 'found') return inspecionado;
    let result = '';
    const upperNome = nome.toUpperCase();
    if (pg === 'CC' && situacao === 'Temporário') result = `CC (RM3-${quadro}) ${nip} ${upperNome}`;
    else if (pg === 'CC' && situacao === 'Carreira') result = `CC (${quadro}) ${nip} ${upperNome}`;
    else if (['CT', '1T', '2T', 'GM'].includes(pg) && situacao === 'Temporário') result = `${pg} (RM2-${quadro}) ${nip} ${upperNome}`;
    else if (['CT', '1T', 'CMG', 'CF'].includes(pg) && situacao === 'Carreira') result = `${pg} (${quadro}) ${nip} ${upperNome}`;
    else if (['SO', '1SG', '2SG'].includes(pg) && situacao === 'Carreira') result = `${pg}-${espPraca} ${nip} ${upperNome}`;
    else if (['3SG', 'CB', 'MN'].includes(pg) && situacao === 'Temporário') result = `${pg}-RM2-${espPraca} ${nip} ${upperNome}`;
    else if (['3SG', 'CB', 'MN'].includes(pg) && situacao === 'Carreira') result = `${pg}-${espPraca} ${nip} ${upperNome}`;
    else if (['MN-RC', 'SD', 'GR', 'ALUNO', 'SCNS'].includes(pg)) result = `${pg} ${nip} ${upperNome}`;
    return result;
  };

  const resetForm = () => {
    setPeritoSelecionado(''); setFinalidade(''); setEspecialidade(''); setHistorico('');
    setNip(''); setMilitarStatus(''); setInspecionado(''); setOmLeitura('');
    setOm(''); setPg(''); setCirculo(''); setQuadro(''); setEspPraca(''); setNome(''); setSituacao('');
    setSuccessPdfUrl(null); setSuccessPdfId(null); setErros({}); setBuscaNomeAberta(false);
  };

  const getPgq = () => {
    if (pg === 'CC' && situacao === 'Temporário') return `CC (RM3-${quadro})`;
    if (['CT', '1T', '2T', 'GM'].includes(pg) && situacao === 'Temporário') return `${pg} (RM2-${quadro})`;
    if (['3SG', 'CB', 'MN'].includes(pg) && situacao === 'Temporário') return `${pg}-RM2-${espPraca}`;
    if (circulo === 'Oficial') return `${pg} (${quadro})`;
    if (circulo === 'Praça') return `${pg}-${espPraca}`;
    return pg;
  };

  const validar = (): Erros => {
    const e: Erros = {};
    if (!peritoSelecionado) e.perito = 'Selecione o perito.';
    if (!finalidade) e.finalidade = 'Selecione a finalidade.';
    if (!especialidade) e.especialidade = 'Selecione a especialidade.';
    if (!nip) e.nip = 'Informe o NIP do militar.';
    else if (nip.length < 10) e.nip = 'O NIP tem o formato 00.0000.00.';
    if (militarStatus === 'not_found') {
      if (!pg) e.pg = 'Selecione o posto/graduação.';
      if (!om.trim()) e.om = 'Informe a OM.';
      if (!nome.trim()) e.nome = 'Informe o nome completo.';
      if (circulo === 'Oficial' && !quadro) e.quadro = 'Selecione o quadro.';
      if (circulo === 'Praça' && !espPraca) e.espPraca = 'Selecione a especialidade.';
      if (['CC', 'CT', '1T', 'MN', 'CB', '3SG'].includes(pg) && !situacao) e.situacao = 'Selecione a situação.';
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      avisar('Revise os campos destacados.');
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [role="radiogroup"][aria-invalid="true"]')?.focus());
      return;
    }
    setShowConfirm(true);
  };

  const executeSubmit = async () => {
    setShowConfirm(false);
    const peritoInfo = peritoSelecionado === 'MAURISTON' ? PERITOS.CT_MAURISTON : PERITOS.CT_JULIO;
    const generatedInspecionado = generateInspecionado();
    setIsLoading(true); setSuccessPdfUrl(null);
    const payload = { isNewMilitar: militarStatus === 'not_found', nip, om: militarStatus === 'found' ? omLeitura : om, pgq: getPgq(), nomeMilitar: nome.toUpperCase(), situacao, inspecionado: generatedInspecionado, finalidade, especialidade, historico, peritoIdentifier: peritoInfo.perito, emailPerito: peritoInfo.email, nomePerito: peritoInfo.nomePerito, postoPerito: peritoInfo.posto, cargoPerito: peritoInfo.cargo };
    try {
      const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) { setSuccessPdfUrl(data.pdfUrl); setSuccessPdfId(data.pdfFileId); setPareceresHistory([]); }
      else avisar('Erro ao gerar parecer: ' + data.message);
    } catch (error) { console.error(error); avisar('Falha na comunicação com o servidor Google.'); }
    finally { setIsLoading(false); }
  };

  const handleImprimir = async () => {
    if (!successPdfId) return;
    setIsPrinting(true);
    try {
      const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'imprimir', pdfId: successPdfId }) });
      const data = await response.json();
      if (data.success) avisar('Pedido de impressão enviado com sucesso.', 'success');
      else avisar('Erro ao solicitar impressão: ' + data.message);
    } catch (error) { console.error(error); avisar('Falha na comunicação com o servidor Google ao imprimir.'); }
    finally { setIsPrinting(false); }
  };

  const espOptions = Array.from(new Set<string>(pareceresHistory.map(p => p.especialidade).filter(Boolean))).sort();
  const handleSort = (col: 'data' | 'inspecionado') => {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir(col === 'data' ? 'desc' : 'asc'); }
  };
  const parseDate = (str: string) => { const [d, m, y] = String(str).split('/'); return new Date(`${y}-${m}-${d}`).getTime() || 0; };
  const filteredHistory = pareceresHistory
    .filter(p => {
      const nameMatch = historySearch.trim() === '' || extrairNomeInspecionado(p.inspecionado).toLowerCase().includes(historySearch.toLowerCase());
      const espMatch = historyEspFilter === '' || p.especialidade === historyEspFilter;
      return nameMatch && espMatch;
    })
    .sort((a, b) => {
      const cmp = sortCol === 'data' ? parseDate(a.data) - parseDate(b.data) : extrairNomeInspecionado(a.inspecionado).localeCompare(extrairNomeInspecionado(b.inspecionado), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const limparErro = (k: string) => setErros(er => (er[k] ? { ...er, [k]: '' } : er));
  const iconeOrdem = (col: 'data' | 'inspecionado') => (sortCol === col ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more');
  const ariaSort = (col: 'data' | 'inspecionado') => (sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');

  const card = 'bg-white rounded-xl border border-line p-5 space-y-4';

  return (
    <div className="flex flex-col flex-1 relative">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size={activeTab === 'historico' ? 'data' : 'form'} className="pt-6 md:pt-8">
        <PageHeader
          title="Pareceres"
          description="Gere pedidos de parecer em PDF por especialidade."
          actions={activeTab === 'novo' && !successPdfUrl ? (
            <Button variant="secondary" icon="help" aria-expanded={showHelp} onClick={() => setShowHelp(v => !v)}>Ajuda</Button>
          ) : undefined}
        />
      </Container>
      <Container size={activeTab === 'historico' ? 'data' : 'form'} className="pb-4">
        <Segmented
          ariaLabel="Seção de Pareceres"
          fullWidth
          options={[{ value: 'novo', label: 'Novo', icon: 'add_circle' }, { value: 'historico', label: 'Histórico', icon: 'history' }]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </Container>

      {activeTab === 'historico' && (
        <Container size="data" className="pb-10 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
              <input type="search" aria-label="Buscar por inspecionado" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Buscar por inspecionado…" className={`${controlClass} pl-10`} autoComplete="off" />
            </div>
            <select aria-label="Filtrar por especialidade" value={historyEspFilter} onChange={e => setHistoryEspFilter(e.target.value)} className={`${controlClass} sm:w-56`}>
              <option value="">Todas as especialidades</option>
              {espOptions.map(esp => <option key={esp} value={esp}>{esp}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-line overflow-clip">
            {isFetchingHistory ? (
              <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando histórico…</p>
            ) : filteredHistory.length === 0 ? (
              <EmptyState icon="description" title={pareceresHistory.length === 0 ? 'Nenhum parecer registrado' : 'Nenhum resultado'} description={pareceresHistory.length === 0 ? 'Os pareceres gerados aparecem aqui.' : 'Ajuste a busca ou o filtro de especialidade.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                    <tr>
                      <th scope="col" aria-sort={ariaSort('data')} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                        <button type="button" onClick={() => handleSort('data')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">Data<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('data')}</span></button>
                      </th>
                      <th scope="col" aria-sort={ariaSort('inspecionado')} className="px-4 py-3 text-left font-semibold">
                        <button type="button" onClick={() => handleSort('inspecionado')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">Inspecionado<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('inspecionado')}</span></button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold hidden md:table-cell">Especialidade</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Finalidade</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Perito</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-thead transition-colors">
                        <td className="px-4 py-3 text-ink-2 whitespace-nowrap align-top">{item.data}</td>
                        <td className="px-4 py-3 align-top">
                          <span className="block font-semibold text-navy break-words">{extrairNomeInspecionado(item.inspecionado)}</span>
                          <span className="block md:hidden text-xs text-ink-3 mt-0.5">{item.especialidade}</span>
                        </td>
                        <td className="px-4 py-3 text-ink-2 align-top hidden md:table-cell">{item.especialidade || '—'}</td>
                        <td className="px-4 py-3 text-ink-2 align-top hidden lg:table-cell">{item.finalidade || '—'}</td>
                        <td className="px-4 py-3 text-ink-2 align-top hidden lg:table-cell">{item.perito || '—'}</td>
                        <td className="px-4 py-2 text-right align-top">
                          {item.link ? (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm font-bold text-navy hover:underline">
                              Abrir PDF<span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {filteredHistory.length > 0 && (
            <p className="text-center text-xs text-ink-3" role="status">{filteredHistory.length} registro{filteredHistory.length !== 1 ? 's' : ''}</p>
          )}
        </Container>
      )}

      {activeTab === 'novo' && successPdfUrl && (
        <Container size="form" className="pb-10">
          <div className="bg-white rounded-xl border border-line p-6 md:p-8 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-green-700" aria-hidden="true">check_circle</span>
            <h2 className="font-heading text-xl font-bold text-navy">Parecer gerado</h2>
            <p className="text-sm text-ink-2 max-w-sm">O PDF foi salvo no Drive e enviado para o seu e-mail, com a versão editável em .odt.</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2">
              <a href={successPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">open_in_new</span>Abrir PDF
              </a>
              <Button variant="secondary" icon="print" loading={isPrinting} onClick={handleImprimir}>Imprimir na Secretaria</Button>
              <Button variant="ghost" icon="add" onClick={resetForm}>Novo pedido</Button>
            </div>
          </div>
        </Container>
      )}

      {activeTab === 'novo' && !successPdfUrl && (
        <Container size="form" className="pb-0">
          {showHelp && (
            <div className="mb-4 bg-white border border-line border-l-4 border-l-gold rounded-xl p-4 text-sm text-ink-2 space-y-2">
              <p>Preencha os dados da inspeção e do militar e gere um pedido de parecer a partir de templates com perguntas padrão para: <strong>{ESPECIALIDADES.join(', ')}</strong>.</p>
              <p>No final você recebe o parecer no seu Zimbra em PDF, e editável no formato .odt.</p>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5 pb-6">
              <section className={card} aria-labelledby="pareceres-inspecao">
                <h2 id="pareceres-inspecao" className="font-heading font-bold text-navy text-base">Dados da inspeção</h2>
                <ChoiceGroup<'MAURISTON' | 'JULIO'>
                  label="Perito" required error={erros.perito} value={peritoSelecionado}
                  onChange={v => { setPeritoSelecionado(v); limparErro('perito'); }}
                  options={[{ value: 'MAURISTON', label: 'CT Mauriston' }, { value: 'JULIO', label: 'CT Júlio César' }]}
                />
                <Field label="Finalidade" required error={erros.finalidade}>
                  {a => (
                    <select {...a} value={finalidade} onChange={e => { setFinalidade(e.target.value); limparErro('finalidade'); }}>
                      <option value="">Selecione…</option>
                      {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Especialidade" required error={erros.especialidade}>
                  {a => (
                    <select {...a} value={especialidade} onChange={e => { setEspecialidade(e.target.value); limparErro('especialidade'); }}>
                      <option value="">Selecione…</option>
                      {ESPECIALIDADES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Histórico" help="Opcional. Entra no corpo do pedido de parecer.">
                  {a => <textarea {...a} value={historico} onChange={e => setHistorico(e.target.value)} placeholder="Militar em LTS há xx dias pelo CID X00.0…" className={`${a.className} min-h-[100px]`} />}
                </Field>
              </section>

              <section className={card} aria-labelledby="pareceres-militar">
                <h2 id="pareceres-militar" className="font-heading font-bold text-navy text-base">Dados do militar</h2>
                <div>
                  <Field label="NIP" required error={erros.nip} help={militarStatus === 'found' ? undefined : 'Formato 00.0000.00. Ao completar, o militar é buscado na base.'}>
                    {a => (
                      <div className="relative">
                        <input {...a} type="text" inputMode="numeric" value={nip} onChange={handleNipChange} placeholder="00.0000.00" className={`${a.className} font-mono pr-10`} />
                        {militarStatus === 'loading' && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-navy animate-spin" aria-label="Buscando militar">progress_activity</span>}
                        {militarStatus === 'found' && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-green-700" aria-label="Militar encontrado">check_circle</span>}
                      </div>
                    )}
                  </Field>
                  <div className="mt-1">
                    <button type="button" onClick={alternarBuscaNome} aria-expanded={buscaNomeAberta} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-navy underline underline-offset-2">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{buscaNomeAberta ? 'expand_less' : 'person_search'}</span>
                      {buscaNomeAberta ? 'Fechar busca por nome' : 'Pesquisar pelo nome'}
                    </button>
                  </div>
                  {buscaNomeAberta && (
                    <div className="mt-1 border border-line rounded-lg p-3 bg-thead space-y-2">
                      <input type="search" aria-label="Nome do militar" autoFocus value={pesquisarNomeTerm} onChange={e => setPesquisarNomeTerm(e.target.value)} placeholder="Digite parte do nome…" className={controlClass} autoComplete="off" />
                      <div className="max-h-60 overflow-y-auto bg-white border border-line rounded-lg" role="listbox" aria-label="Militares encontrados">
                        {isCarregandoMilitares ? (
                          <p className="p-4 text-sm text-ink-3 text-center" role="status">Carregando base de dados…</p>
                        ) : !pesquisarNomeTerm.trim() ? (
                          <p className="p-4 text-sm text-ink-3 text-center">Digite para buscar.</p>
                        ) : resultadosNome.length === 0 ? (
                          <p className="p-4 text-sm text-ink-3 text-center">Nenhum militar encontrado com esse nome.</p>
                        ) : resultadosNome.slice(0, 50).map((m, idx) => (
                          <button key={idx} type="button" role="option" aria-selected={false} onClick={() => selecionarNomeNip(m.nip)} className="w-full text-left px-4 py-2 min-h-[44px] border-b border-line last:border-b-0 hover:bg-thead">
                            <span className="block font-bold text-navy text-sm">{m.nome}</span>
                            <span className="block text-xs text-ink-3 font-mono">{m.nip}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {militarStatus === 'found' && (
                  <dl className="bg-thead border border-line border-l-4 border-l-navy rounded-lg p-3 space-y-2">
                    <div><dt className="text-xs font-semibold text-ink-3">Inspecionado</dt><dd className="text-sm font-bold text-navy">{inspecionado}</dd></div>
                    <div><dt className="text-xs font-semibold text-ink-3">OM</dt><dd className="text-sm font-bold text-navy">{omLeitura}</dd></div>
                  </dl>
                )}

                {militarStatus === 'not_found' && (
                  <div className="space-y-4 border-t border-dashed border-line pt-4">
                    <p className="text-xs text-ink-3">Militar não encontrado na base. Preencha os dados para cadastrá-lo.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Posto/Graduação" required error={erros.pg}>
                        {a => (
                          <select {...a} value={pg} onChange={e => { setPg(e.target.value); limparErro('pg'); }}>
                            <option value="">Selecione…</option>
                            {PG_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                      </Field>
                      <Field label="OM" required error={erros.om}>
                        {a => (
                          <>
                            <input {...a} type="text" list="om-options" value={om} onChange={e => { setOm(e.target.value); limparErro('om'); }} placeholder="Ex.: HNRe" />
                            <datalist id="om-options">{omsOptions.map(opt => <option key={opt} value={opt} />)}</datalist>
                          </>
                        )}
                      </Field>
                    </div>
                    {circulo === 'Oficial' && (
                      <Field label="Quadro" required error={erros.quadro}>
                        {a => (
                          <select {...a} value={quadro} onChange={e => { setQuadro(e.target.value); limparErro('quadro'); }}>
                            <option value="">Selecione…</option>
                            {QUADROS.map(q => <option key={q} value={q}>{q}</option>)}
                          </select>
                        )}
                      </Field>
                    )}
                    {circulo === 'Praça' && (
                      <Field label="Especialidade (praça)" required error={erros.espPraca}>
                        {a => (
                          <select {...a} value={espPraca} onChange={e => { setEspPraca(e.target.value); limparErro('espPraca'); }}>
                            <option value="">Selecione…</option>
                            {ESP_PRACAS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        )}
                      </Field>
                    )}
                    <Field label="Nome completo" required error={erros.nome}>
                      {a => <input {...a} type="text" value={nome} onChange={e => { setNome(e.target.value.toUpperCase()); limparErro('nome'); }} className={`${a.className} uppercase`} />}
                    </Field>
                    {['CC', 'CT', '1T', 'MN', 'CB', '3SG'].includes(pg) && (
                      <ChoiceGroup<'Carreira' | 'Temporário'>
                        label="Situação" required error={erros.situacao} value={situacao}
                        onChange={v => { setSituacao(v); limparErro('situacao'); }}
                        options={[{ value: 'Carreira', label: 'Carreira' }, { value: 'Temporário', label: 'Temporário' }]}
                      />
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-canvas/95 backdrop-blur border-t border-line flex flex-col-reverse sm:flex-row sm:justify-between gap-2 z-10">
              <Button variant="secondary" icon="restart_alt" onClick={resetForm}>Limpar</Button>
              <Button type="submit" icon="send" loading={isLoading}>{isLoading ? 'Gerando parecer…' : 'Gerar parecer'}</Button>
            </div>
          </form>
        </Container>
      )}

      {showConfirm && (
        <ConfirmDialog
          title="Gerar parecer"
          message="Confirma o envio e a geração do pedido de parecer pericial?"
          confirmLabel="Gerar parecer"
          onConfirm={executeSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};
