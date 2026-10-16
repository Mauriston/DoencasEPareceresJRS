// Ficheiro: components/PericiaMenor.tsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Container, PageHeader } from './ui/Page';
import { useParams } from 'react-router-dom';
import { periciaMenorPath } from '../config/routes';
import { EmptyState } from './ui/EmptyState';
import { PericiaMenorDetalhe } from './PericiaMenorDetalhe';
import { PericiaStatusTags } from './ui/PericiaStatusTags';
import { Button } from './ui/Button';
import { Field, controlClass } from './ui/Field';
import { ChoiceGroup } from './ui/ChoiceGroup';
import { Dialog, ConfirmDialog } from './ui/Dialog';
import { Toast } from './ui/Toast';
import { GAS_URL } from '../config/endpoints';
import { Segmented } from './ui/Segmented';
import { CheckCircle2, ChevronDown, Camera, Crop as CropIcon, X } from './ui/icons';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { NavContext } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';

interface PericiaMenorRecord {
  inspecionado: string;
  om: string;
  cid: string;
  dispensas: string;
  dataAtestado: string;
  dataAtestadoTs: number;
  tempoAtestado: string;
  tempoHomolog: string;
  vigente: boolean;
  concluido: boolean;
  vdf: boolean;
  link: string;
}

interface CidItem { SUBCAT: string; DESCRICAO: string; DESCRABREV: string; }
interface ServicoItem { superior_direto: string; servico_id: string; servico: string; servico_label: string; }

const EXTENSOS: Record<number, string> = {
  1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco", 6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez",
  11: "onze", 12: "doze", 13: "treze", 14: "catorze", 15: "quinze", 16: "dezesseis", 17: "dezessete", 18: "dezoito", 19: "dezenove", 20: "vinte"
};

const PG_OPTIONS = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR", "ALUNO", "SCNS"];
const QUADROS = ["AA", "AFN", "CA", "CD", "CN", "EN", "FN", "IM", "Md", "QC-CA", "QC-FN", "QC-IM", "S", "T"];
const ESP_PRACAS = ["AD", "AH", "AM", "AR", "MC", "MT", "AT", "AV", "BA", "CA", "CP", "CI", "CN", "CL", "CT", "CO", "DA", "DM", "DT", "ED", "EP", "EL", "ET", "TE", "EF", "EG", "ES", "AE", "EN", "FR", "GC", "GR", "HN", "HD", "IF", "MR", "MA", "NA", "MI", "MG", "ML", "ME", "MO", "MS", "MU", "ND", "OR", "OS", "PL", "PC", "PD", "PT", "QI", "RM", "RB", "SC", "SI", "TC"];

const removeAcentos = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const PericiaMenor: React.FC = () => {
  const nav = useContext(NavContext);
  const perfil = nav?.authUser?.perfil;
  const canNovo = canUseFeature('pericia-menor.novo', perfil);
  const canHistorico = canUseFeature('pericia-menor.historico', perfil);

  const [nip, setNip] = useState('');
  const [militarStatus, setMilitarStatus] = useState<"" | "loading" | "found" | "not_found">(" ");
  const [inspecionado, setInspecionado] = useState("");
  const [omLeitura, setOmLeitura] = useState("");
  const [om, setOm] = useState("");
  const [pg, setPg] = useState("");
  const [circulo, setCirculo] = useState("");
  const [quadro, setQuadro] = useState("");
  const [espPraca, setEspPraca] = useState("");
  const [nome, setNome] = useState("");
  const [situacao, setSituacao] = useState("");

  const [showPesquisarNomeModal, setShowPesquisarNomeModal] = useState(false);
  const [pesquisarNomeTerm, setPesquisarNomeTerm] = useState("");
  const [militaresInfoList, setMilitaresInfoList] = useState<{nome: string, nip: string}[]>([]);
  const [isCarregandoMilitares, setIsCarregandoMilitares] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [servicoQuery, setServicoQuery] = useState('');
  const [servicoOptions, setServicoOptions] = useState<ServicoItem[]>([]);
  const [filteredServicos, setFilteredServicos] = useState<ServicoItem[]>([]);
  const [selectedServico, setSelectedServico] = useState<ServicoItem | null>(null);
  const [showServicoDropdown, setShowServicoDropdown] = useState(false);

  const [dataAtestado, setDataAtestado] = useState('');
  const [tempoAtestado, setTempoAtestado] = useState('');
  const [cidQuery, setCidQuery] = useState('');
  const [cidOptions, setCidOptions] = useState<CidItem[]>([]);
  const [filteredCids, setFilteredCids] = useState<CidItem[]>([]);
  const [selectedCid, setSelectedCid] = useState<CidItem | null>(null);
  const [showCidDropdown, setShowCidDropdown] = useState(false);

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tempoHomologacao, setTempoHomologacao] = useState('');
  const [selectedDispensas, setSelectedDispensas] = useState<string[]>([]);
  const [showDispensasDropdown, setShowDispensasDropdown] = useState(false);
  const [vdf, setVdf] = useState<boolean | null>(null);
  const [selectedPerito, setSelectedPerito] = useState('');

  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [omsOptions, setOmsOptions] = useState<string[]>([]);
  const [dispensasDisponiveis, setDispensasDisponiveis] = useState<string[]>([]);
  const [peritosDisponiveis, setPeritosDisponiveis] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const avisar = (msg: string, tone: 'success' | 'error' = 'error') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), 5000); };
  const limparErro = (k: string) => setErros(er => (er[k] ? { ...er, [k]: '' } : er));
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  // Aba e pessoa são níveis da URL: /pericia-menor/novo · /historico · /historico/:pessoa.
  const { aba: abaParam, pessoa: pessoaParam } = useParams();
  // A aba pedida na URL respeita as permissões por aba (pericia-menor.novo / .historico):
  // sem permissão para ela, cai na aba liberada (como o estado inicial já fazia).
  const abaPedida = abaParam === 'historico' || pessoaParam ? 'historico' : abaParam === 'novo' ? 'novo' : null;
  const activeTab: 'novo' | 'historico' =
    abaPedida === 'novo' && canNovo ? 'novo' : abaPedida === 'historico' && canHistorico ? 'historico' : (canNovo ? 'novo' : 'historico');
  const setActiveTab = (tab: 'novo' | 'historico') => nav?.navigate(periciaMenorPath(tab), { replace: true });
  const [history, setHistory] = useState<PericiaMenorRecord[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [filterVigente, setFilterVigente] = useState(true);
  const [filterConcluido, setFilterConcluido] = useState(false);
  const [filterLts, setFilterLts] = useState(false);
  const [filterRestricoes, setFilterRestricoes] = useState(false);
  const [sortCol, setSortCol] = useState<'data' | 'inspecionado'>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const selectedPerson: string | null = pessoaParam ? decodeURIComponent(pessoaParam) : null;
  const setSelectedPerson = (nome: string | null) => nav?.navigate(nome ? periciaMenorPath('historico', nome) : periciaMenorPath('historico'));
  const [vigentesCount, setVigentesCount] = useState(0);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const res = await fetch(`${GAS_URL}?action=getLookups`);
        const json = await res.json();
        if (json.success) {
          setDispensasDisponiveis(json.data.DISPENSAS.filter(Boolean) || []);
          setPeritosDisponiveis(json.data.PERITOS || []);
          setOmsOptions(json.data.OM.filter(Boolean) || []);
        }
      } catch (err) { console.error(err); } finally { setIsLoadingLookups(false); }
    };
    const fetchCid = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}cid.json`);
        if (res.ok) setCidOptions(await res.json());
      } catch (err) { console.error(err); }
    };
    const fetchServicos = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}servicosHNRe.json`);
        if (res.ok) setServicoOptions(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchLookups(); fetchCid(); fetchServicos();
  }, []);

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 6) value = `${value.slice(0,2)}.${value.slice(2,6)}.${value.slice(6)}`;
    else if (value.length > 2) value = `${value.slice(0,2)}.${value.slice(2)}`;
    setNip(value);
    if (value.length === 10) searchNip(value);
    else { setMilitarStatus(""); setSearchError(''); }
  };

  const searchNip = async (nipVal: string) => {
    setMilitarStatus("loading"); setSearchError('');
    try {
      const res = await fetch(`${GAS_URL}?action=getMilitar&nip=${nipVal}`);
      const data = await res.json();
      if (data.success && data.data) { setInspecionado(data.data.INSPECIONADO); setOmLeitura(data.data.OM); setMilitarStatus("found"); }
      else { setMilitarStatus("not_found"); setSearchError('Militar não encontrado. Preencha manualmente.'); }
    } catch (err) { console.error(err); setMilitarStatus("not_found"); setSearchError('Erro ao buscar militar.'); }
  };

  const abrirModalPesquisaNome = async (initialTerm: string = "", autoSelect: boolean = false) => {
    let currentList = militaresInfoList;
    setPesquisarNomeTerm(initialTerm);
    if (currentList.length === 0) {
      if (!autoSelect) setShowPesquisarNomeModal(true);
      setIsCarregandoMilitares(true);
      try {
        const resp = await fetch(`${GAS_URL}?action=getMilitaresList`);
        const data = await resp.json();
        if (data.success && data.data) { setMilitaresInfoList(data.data); currentList = data.data; }
      } catch (err) { console.error(err); } finally { setIsCarregandoMilitares(false); }
    } else { if (!autoSelect) setShowPesquisarNomeModal(true); }
    if (autoSelect && initialTerm) {
      const terms = removeAcentos(initialTerm.toLowerCase()).split(/\s+/).filter(Boolean);
      const filtered = currentList.filter(m => { const n = removeAcentos(m.nome.toLowerCase()); return terms.every(t => n.includes(t)); });
      if (filtered.length === 1) selecionarNomeNip(filtered[0].nip);
      else setShowPesquisarNomeModal(true);
    } else if (!autoSelect) setShowPesquisarNomeModal(true);
  };

  const selecionarNomeNip = (selectedNip: string) => { setNip(selectedNip); setShowPesquisarNomeModal(false); searchNip(selectedNip); };

  useEffect(() => {
    if (militarStatus !== "not_found" || !pg) return;
    if (["CMG", "CF", "SO", "1SG", "2SG"].includes(pg)) setSituacao("Carreira");
    else if (["2T", "GM"].includes(pg)) setSituacao("Temporário");
    else setSituacao("");
    if (["CMG", "CF", "CC", "CT", "1T", "2T", "GM"].includes(pg)) setCirculo("Oficial");
    else if (["SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR"].includes(pg)) setCirculo("Praça");
    else setCirculo("");
  }, [pg, militarStatus]);

  const handleServicoSearch = (text: string) => {
    setServicoQuery(text); setSelectedServico(null);
    if (text.trim().length > 1) {
      const q = removeAcentos(text.trim().toLowerCase());
      const filtered = servicoOptions.filter(s => {
        const sup = removeAcentos((s.superior_direto || '').toLowerCase());
        const sv = removeAcentos((s.servico || '').toLowerCase());
        const lb = removeAcentos((s.servico_label || '').toLowerCase());
        return sup.includes(q) || sv.includes(q) || lb.includes(q);
      }).slice(0, 15);
      setFilteredServicos(filtered); setShowServicoDropdown(true);
    } else setShowServicoDropdown(false);
  };

  const handleCidSearch = (text: string) => {
    setCidQuery(text); setSelectedCid(null);
    if (text.length > 1) {
      const q = removeAcentos(text.toLowerCase());
      const filtered = cidOptions.filter(c => {
        const sub = removeAcentos((c.SUBCAT || '').toLowerCase());
        const desc = removeAcentos((c.DESCRICAO || '').toLowerCase());
        return sub.includes(q) || desc.includes(q);
      }).slice(0, 15);
      setFilteredCids(filtered); setShowCidDropdown(true);
    } else setShowCidDropdown(false);
  };

  const handleTempoInput = (val: string, setter: (v: string) => void, maxLimit?: number) => {
    let n = val.replace(/\D/g, '');
    if (n !== '') {
      let num = parseInt(n, 10);
      if (maxLimit && num > maxLimit) num = maxLimit;
      if (num < 1) num = 1;
      setter(num.toString());
    } else setter('');
  };

  const formatTempoBlur = (val: string, setter: (v: string) => void) => {
    if (val) { let num = parseInt(val.replace(/\D/g, ''), 10); if (isNaN(num) || num < 1) num = 1; setter(`${num} dia${num > 1 ? 's' : ''}`); }
  };

  const formatTempoFocus = (val: string, setter: (v: string) => void) => { if (val) setter(val.replace(/\D/g, '')); };

  const handleDispensaToggle = (dispensa: string) => {
    if (dispensa === 'TODAS AS ATIVIDADES') {
      if (selectedDispensas.includes('TODAS AS ATIVIDADES')) setSelectedDispensas([]);
      else setSelectedDispensas(['TODAS AS ATIVIDADES']);
    } else {
      let ns = selectedDispensas.filter(d => d !== 'TODAS AS ATIVIDADES');
      if (ns.includes(dispensa)) ns = ns.filter(d => d !== dispensa);
      else ns.push(dispensa);
      setSelectedDispensas(ns);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImgSrc(reader.result?.toString() || ''); setShowCropModal(true); });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = () => {
    if (!imgRef.current || !completedCrop || completedCrop.width <= 0) { setShowCropModal(false); return; }
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width; canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    setCroppedImageUrl(canvas.toDataURL('image/jpeg', 0.6));
    setShowCropModal(false); setImgSrc('');
  };

  const extractDataWithGemini = async () => {
    if (!croppedImageUrl) return;
    setIsExtracting(true);
    try {
      const base64Data = croppedImageUrl.split(',')[1];
      const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'extrair_dados_atestado', base64Image: base64Data }) });
      const result = await response.json();
      if (result.success && result.data) {
        if (result.data.dataAtestado) setDataAtestado(result.data.dataAtestado);
        if (result.data.tempoAtestado) handleTempoInput(result.data.tempoAtestado.toString(), setTempoAtestado);
        if (result.data.cid) {
          const cidCode = result.data.cid.toLowerCase().replace(/[^a-z0-9]/g, '');
          const foundCid = cidOptions.find(c => { const sub = (c.SUBCAT || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return sub === cidCode || sub.includes(cidCode); });
          if (foundCid) { setSelectedCid(foundCid); setCidQuery(''); } else setCidQuery(result.data.cid);
        }
        if (result.data.nomeMilitar) await abrirModalPesquisaNome(result.data.nomeMilitar, true);
      } else avisar(`Aviso: ${result.message || 'Não foi possível ler o documento.'}`);
    } catch (err) { console.error(err); avisar('Erro de comunicação com o servidor ao invocar a IA.'); }
    finally { setIsExtracting(false); }
  };

  const handleReset = () => {
    setSuccessPdfUrl(null); setNip(''); setMilitarStatus(""); setSearchError(''); setServicoQuery(''); setSelectedServico(null);
    setDataAtestado(''); setTempoAtestado(''); setCidQuery(''); setSelectedCid(null); setTempoHomologacao('');
    setSelectedDispensas([]); setVdf(null); setSelectedPerito(''); setNome(''); setPg(''); setQuadro(''); setErros({});
    setEspPraca(''); setOm(''); setSituacao(''); setCirculo(''); setOmLeitura(''); setCroppedImageUrl('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!selectedServico) e.servico = 'Selecione o serviço na lista.';
    if (!nip) e.nip = 'Informe o NIP do militar.';
    else if (nip.length < 10) e.nip = 'O NIP tem o formato 00.0000.00.';
    if (!dataAtestado) e.dataAtestado = 'Informe a data do atestado.';
    if (!tempoAtestado) e.tempoAtestado = 'Informe o tempo do atestado.';
    if (!selectedCid) e.cid = 'Selecione o CID na lista.';
    if (!tempoHomologacao) e.tempoHomolog = 'Informe o tempo homologado.';
    if (selectedDispensas.length === 0) e.dispensas = 'Selecione ao menos uma dispensa.';
    if (vdf === null) e.vdf = 'Indique se há VDF.';
    if (!selectedPerito) e.perito = 'Selecione o perito.';
    if (militarStatus === 'not_found') {
      if (!pg) e.pg = 'Selecione o posto/graduação.';
      if (!om.trim()) e.om = 'Informe a OM.';
      if (!nome.trim()) e.nome = 'Informe o nome completo.';
    }
    return e;
  };

  const handleSubmit = () => {
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      avisar('Revise os campos destacados.');
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setShowConfirm(true);
  };

  const executeSubmit = async () => {
    setShowConfirm(false);
    if (!selectedServico || !selectedCid) return;
    setIsSubmitting(true);
    let militarIdentifier = militarStatus === "found" ? inspecionado : `${pg} ${quadro ? quadro + ' ' : ''}${espPraca ? espPraca + ' ' : ''}${nip} ${nome}`.trim().replace(/\s+/g, ' ');
    const tempoHomologNumerico = parseInt(tempoHomologacao.replace(/\D/g, ''), 10);
    const payload = {
      action: 'gerar_pericia_menor', inspecionado: militarIdentifier, om: militarStatus === "found" ? omLeitura : om,
      servico: selectedServico.servico_label, cid: `${selectedCid.SUBCAT} - ${selectedCid.DESCRICAO}`,
      dispensas: selectedDispensas.join(', '), dataAtestado, tempoAtestado: tempoAtestado.replace(/\D/g, ''),
      tempoHomolog: tempoHomologNumerico, tempoExtenso: EXTENSOS[tempoHomologNumerico] || tempoHomologNumerico.toString(),
      vdf, perito: selectedPerito, isNewMilitar: militarStatus === "not_found", nip,
      pgq: `${pg} ${quadro ? quadro : ''}${espPraca ? espPraca : ''}`.trim(), nomeMilitar: nome, situacao,
      base64Image: croppedImageUrl ? croppedImageUrl.split(',')[1] : null
    };
    try {
      const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) setSuccessPdfUrl(data.pdfUrl);
      else avisar('Erro ao gerar Perícia Menor: ' + data.message);
    } catch (error) { console.error(error); avisar('Falha na comunicação com o servidor.'); }
    finally { setIsSubmitting(false); }
  };

  const fetchHistory = async () => {
    if (history.length > 0) return;
    setIsFetchingHistory(true);
    try {
      const res = await fetch(`${GAS_URL}?action=getPericiaMenorList`);
      const json = await res.json();
      if (json.success) { setHistory(json.data); setVigentesCount(json.data.filter((r: PericiaMenorRecord) => r.vigente).length); }
    } catch (e) { console.error(e); } finally { setIsFetchingHistory(false); }
  };

  // Se o perfil não tiver acesso à aba "Novo", a página já abre em
  // "Histórico" (ver activeTab acima) — carrega os dados de uma vez.
  useEffect(() => {
    if (activeTab === 'historico' && canHistorico) fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, canHistorico]);

  const isRestricao = (r: PericiaMenorRecord) => r.dispensas.trim() !== '' && !r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES');
  const vigentesTotal = history.filter(r => r.vigente).length;
  const concluidosTotal = history.filter(r => r.concluido).length;
  const ltsTotal = history.filter(r => r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES')).length;
  const restricoesTotal = history.filter(isRestricao).length;

  const parseDate = (str: string): number => { const [d, m, y] = str.split('/'); return new Date(Number(y), Number(m) - 1, Number(d)).getTime(); };
  const handleSort = (col: 'data' | 'inspecionado') => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };

  const filteredHistory = history
    .filter(r => filterVigente ? r.vigente : true)
    .filter(r => filterConcluido ? r.concluido : true)
    .filter(r => filterLts ? r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES') : true)
    .filter(r => filterRestricoes ? isRestricao(r) : true)
    .filter(r => historySearch === '' || r.inspecionado.toLowerCase().includes(historySearch.toLowerCase()))
    .sort((a, b) => { let cmp = sortCol === 'data' ? parseDate(a.dataAtestado) - parseDate(b.dataAtestado) : a.inspecionado.localeCompare(b.inspecionado, 'pt-BR'); return sortDir === 'asc' ? cmp : -cmp; });

  // Os filtros continuam exclusivos entre si (vigentes × concluídas, LTS × restrições);
  // "Todas"/"Todos os tipos" = nenhum filtro ativo.
  const statusFiltro: 'vigentes' | 'concluidas' | 'todas' = filterVigente ? 'vigentes' : filterConcluido ? 'concluidas' : 'todas';
  const definirStatusFiltro = (v: 'vigentes' | 'concluidas' | 'todas') => { setFilterVigente(v === 'vigentes'); setFilterConcluido(v === 'concluidas'); };
  const tipoFiltro: 'todos' | 'lts' | 'restricoes' = filterLts ? 'lts' : filterRestricoes ? 'restricoes' : 'todos';
  const definirTipoFiltro = (v: 'todos' | 'lts' | 'restricoes') => { setFilterLts(v === 'lts'); setFilterRestricoes(v === 'restricoes'); };
  const iconeOrdem = (col: 'data' | 'inspecionado') => (sortCol === col ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more');
  const ariaSort = (col: 'data' | 'inspecionado') => (sortCol === col ? (sortDir === 'asc' ? 'ascending' as const : 'descending' as const) : 'none' as const);
  const resultadosNome = militaresInfoList.filter(m => {
    if (!pesquisarNomeTerm.trim()) return false;
    const terms = removeAcentos(pesquisarNomeTerm.toLowerCase()).split(/\s+/).filter(Boolean);
    const name = removeAcentos(m.nome.toLowerCase());
    return terms.every(t => name.includes(t));
  });
  const card = 'bg-white rounded-xl border border-line p-5 space-y-4';

  if (selectedPerson !== null && canHistorico) {
    const personRecords = history.filter(r => r.inspecionado === selectedPerson);
    if (isFetchingHistory || (history.length === 0 && personRecords.length === 0)) {
      return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando histórico" /></div>;
    }
    if (personRecords.length === 0) {
      return <Container size="reading" className="py-8"><EmptyState icon="person_search" title="Nenhum registro encontrado" description={`Não há perícias menores registradas para ${selectedPerson}.`} /></Container>;
    }
    return <PericiaMenorDetalhe person={selectedPerson} records={personRecords} />;
  }

  return (
    <div className="flex flex-col flex-1 relative">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="pt-6 md:pt-8">
        <PageHeader title="Perícia Menor" description="Registre e consulte as Perícias Menores dos militares de bordo." />
      </Container>
      {canNovo && canHistorico && (
      <Container size="data" className="pb-4">
        <Segmented
          ariaLabel="Seção de Perícia Menor"
          fullWidth
          className="md:w-auto md:inline-flex"
          options={[{ value: 'novo', label: 'Novo', icon: 'add_circle' }, { value: 'historico', label: 'Histórico', icon: 'history', badge: vigentesCount }]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </Container>
      )}

      {activeTab === 'novo' && canNovo && successPdfUrl && (
        <Container size="form" className="pb-10">
          <div className="bg-white rounded-xl border border-line p-6 md:p-8 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-green-700" aria-hidden="true">check_circle</span>
            <h2 className="font-heading text-xl font-bold text-navy">Perícia menor gerada</h2>
            <p className="text-sm text-ink-2 max-w-sm">O PDF foi salvo no Google Drive e a planilha foi atualizada.</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2">
              <a href={successPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">picture_as_pdf</span>Ver PDF gerado
              </a>
              <Button variant="ghost" icon="add" onClick={handleReset}>Nova perícia menor</Button>
            </div>
          </div>
        </Container>
      )}

      {activeTab === 'novo' && canNovo && !successPdfUrl && (
      <Container size="data" className="pb-0">
        {/* Leitura inteligente (IA) */}
        <section className="bg-white border border-line border-l-4 border-l-gold rounded-xl p-4 mb-5" aria-labelledby="pm-ia">
          <h2 id="pm-ia" className="font-heading font-bold text-navy text-base flex items-center gap-2"><Camera size={18} aria-hidden="true" /> Leitura inteligente do atestado</h2>
          <p className="text-xs text-ink-3 mt-1 mb-3">Fotografe o atestado para preencher data, tempo, CID e militar automaticamente. Opcional.</p>
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={onSelectFile} className="hidden" />
          {!croppedImageUrl ? (
            <Button variant="secondary" icon="photo_camera" onClick={() => fileInputRef.current?.click()}>Fotografar atestado</Button>
          ) : (
            <div className="flex items-center gap-3">
              <img src={croppedImageUrl} alt="Atestado recortado" className="w-16 h-16 rounded-lg object-cover border border-line shrink-0" />
              <div className="flex flex-wrap gap-2">
                <Button icon="auto_awesome" loading={isExtracting} onClick={extractDataWithGemini}>{isExtracting ? 'Analisando…' : 'Extrair dados'}</Button>
                <Button variant="secondary" disabled={isExtracting} onClick={() => setCroppedImageUrl('')}>Refazer</Button>
              </div>
            </div>
          )}
        </section>

        <div className="md:grid md:grid-cols-2 md:gap-5 md:items-start space-y-5 md:space-y-0">
          <section className={card} aria-labelledby="pm-militar">
            <h2 id="pm-militar" className="font-heading font-bold text-navy text-base">Dados do militar</h2>
            <div className="relative z-[100]">
              <Field label="Serviço" required error={erros.servico}>
                {a => (
                  <input {...a} type="text" role="combobox" aria-expanded={showServicoDropdown} aria-autocomplete="list" autoComplete="off" value={selectedServico ? selectedServico.servico_label : servicoQuery}
                    onChange={e => { handleServicoSearch(e.target.value); limparErro('servico'); }} placeholder="Busque pelo nome do serviço…" />
                )}
              </Field>
              {showServicoDropdown && filteredServicos.length > 0 && (
                <ul role="listbox" className="absolute z-[110] w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-line">
                  {filteredServicos.map((s, idx) => (
                    <li key={idx} role="option" aria-selected={false}>
                      <button type="button" onClick={() => { setSelectedServico(s); setShowServicoDropdown(false); setServicoQuery(''); }} className="w-full text-left px-4 py-2 min-h-[44px] hover:bg-thead">
                        <span className="font-bold text-navy block text-sm">{s.servico_label}</span><span className="text-xs text-ink-3">{s.superior_direto}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <Field label="NIP" required error={erros.nip || (militarStatus === 'not_found' ? undefined : undefined)} help={searchError || 'Formato 00.0000.00. Ao completar, o militar é buscado na base.'}>
                {a => (
                  <div className="relative">
                    <input {...a} type="text" inputMode="numeric" value={nip} onChange={handleNipChange} placeholder="00.0000.00" className={`${a.className} font-mono pr-10`} />
                    {militarStatus === 'loading' && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-navy animate-spin" aria-label="Buscando militar">progress_activity</span>}
                    {militarStatus === 'found' && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-green-700" aria-label="Militar encontrado">check_circle</span>}
                  </div>
                )}
              </Field>
              <button type="button" onClick={() => abrirModalPesquisaNome()} className="mt-1 inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-navy underline underline-offset-2">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_search</span>Pesquisar pelo nome
              </button>
            </div>
            {militarStatus === 'found' && (
              <dl className="bg-thead border border-line border-l-4 border-l-navy rounded-lg p-3 space-y-2">
                <div><dt className="text-xs font-semibold text-ink-3">Inspecionado</dt><dd className="text-sm font-bold text-navy">{inspecionado}</dd></div>
                <div><dt className="text-xs font-semibold text-ink-3">OM</dt><dd className="text-sm font-bold text-navy">{omLeitura}</dd></div>
              </dl>
            )}
            {militarStatus === 'not_found' && (
              <div className="space-y-4 border-t border-dashed border-line pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Posto/Graduação" required error={erros.pg}>
                    {a => (<select {...a} value={pg} onChange={e => { setPg(e.target.value); limparErro('pg'); }}><option value="">Selecione…</option>{PG_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>)}
                  </Field>
                  <Field label="OM" required error={erros.om}>
                    {a => (<><input {...a} type="text" list="om-options-pm" value={om} onChange={e => { setOm(e.target.value); limparErro('om'); }} placeholder="Ex.: HNRe" /><datalist id="om-options-pm">{omsOptions.map(opt => <option key={opt} value={opt} />)}</datalist></>)}
                  </Field>
                </div>
                {circulo === 'Oficial' && (
                  <Field label="Quadro" required error={erros.quadro}>
                    {a => (<select {...a} value={quadro} onChange={e => { setQuadro(e.target.value); limparErro('quadro'); }}><option value="">Selecione…</option>{QUADROS.map(q => <option key={q} value={q}>{q}</option>)}</select>)}
                  </Field>
                )}
                {circulo === 'Praça' && (
                  <Field label="Especialidade (praça)" required error={erros.espPraca}>
                    {a => (<select {...a} value={espPraca} onChange={e => { setEspPraca(e.target.value); limparErro('espPraca'); }}><option value="">Selecione…</option>{ESP_PRACAS.map(p => <option key={p} value={p}>{p}</option>)}</select>)}
                  </Field>
                )}
                <Field label="Nome completo" required error={erros.nome}>
                  {a => <input {...a} type="text" value={nome} onChange={e => { setNome(e.target.value.toUpperCase()); limparErro('nome'); }} className={`${a.className} uppercase`} />}
                </Field>
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className={card} aria-labelledby="pm-atestado">
              <h2 id="pm-atestado" className="font-heading font-bold text-navy text-base">Dados do atestado</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Data do atestado" required error={erros.dataAtestado}>
                  {a => <input {...a} type="date" value={dataAtestado} onChange={e => { setDataAtestado(e.target.value); limparErro('dataAtestado'); }} />}
                </Field>
                <Field label="Tempo do atestado" required error={erros.tempoAtestado}>
                  {a => <input {...a} type="text" inputMode="numeric" value={tempoAtestado} onChange={e => { handleTempoInput(e.target.value, setTempoAtestado); limparErro('tempoAtestado'); }} onBlur={() => formatTempoBlur(tempoAtestado, setTempoAtestado)} onFocus={() => formatTempoFocus(tempoAtestado, setTempoAtestado)} placeholder="Ex.: 5 dias" />}
                </Field>
              </div>
              <div className="relative z-[90]">
                <Field label="CID" required error={erros.cid}>
                  {a => <input {...a} type="text" role="combobox" aria-expanded={showCidDropdown} aria-autocomplete="list" autoComplete="off" value={selectedCid ? selectedCid.DESCRABREV : cidQuery} onChange={e => { handleCidSearch(e.target.value); limparErro('cid'); }} placeholder="Busque por código ou doença…" />}
                </Field>
                {showCidDropdown && filteredCids.length > 0 && (
                  <ul role="listbox" className="absolute z-10 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-line">
                    {filteredCids.map((cid, idx) => (
                      <li key={idx} role="option" aria-selected={false}>
                        <button type="button" onClick={() => { setSelectedCid(cid); setShowCidDropdown(false); setCidQuery(''); }} className="w-full text-left px-4 py-2 min-h-[44px] hover:bg-thead">
                          <span className="font-bold text-navy block text-sm">{cid.DESCRABREV}</span><span className="text-xs text-ink-3">{cid.DESCRICAO}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className={card} aria-labelledby="pm-homolog">
              <h2 id="pm-homolog" className="font-heading font-bold text-navy text-base">Homologação</h2>
              <Field label="Tempo homologado" required error={erros.tempoHomolog} help="Máximo de 20 dias.">
                {a => <input {...a} type="text" inputMode="numeric" value={tempoHomologacao} onChange={e => { handleTempoInput(e.target.value, setTempoHomologacao, 20); limparErro('tempoHomolog'); }} onBlur={() => formatTempoBlur(tempoHomologacao, setTempoHomologacao)} onFocus={() => formatTempoFocus(tempoHomologacao, setTempoHomologacao)} placeholder="Ex.: 5 dias" className={`${a.className} sm:w-1/2`} />}
              </Field>
              <div className="relative z-[80]">
                <Field label="Dispensas" required error={erros.dispensas}>
                  {a => (
                    <button id={a.id} type="button" aria-haspopup="listbox" aria-expanded={showDispensasDropdown} aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} onClick={() => setShowDispensasDropdown(!showDispensasDropdown)} className={`${a.className} flex justify-between items-center text-left`}>
                      <span className={`truncate ${selectedDispensas.length > 0 ? 'text-navy font-semibold' : 'text-ink-4'}`}>{selectedDispensas.length === 0 ? 'Selecione as dispensas…' : selectedDispensas.includes('TODAS AS ATIVIDADES') ? 'TODAS AS ATIVIDADES' : `${selectedDispensas.length} dispensa(s) selecionada(s)`}</span>
                      <ChevronDown size={18} className={`text-ink-3 transition-transform duration-200 ${showDispensasDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  )}
                </Field>
                {showDispensasDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-64 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {isLoadingLookups ? (<p className="text-xs text-ink-3 col-span-2 text-center py-4" role="status">Carregando dispensas…</p>) : (
                      dispensasDisponiveis.map((disp, idx) => {
                        const isTodas = disp === 'TODAS AS ATIVIDADES';
                        const isSelected = selectedDispensas.includes(disp);
                        const isDisabled = (isTodas && selectedDispensas.length > 0 && !isSelected) || (!isTodas && selectedDispensas.includes('TODAS AS ATIVIDADES'));
                        return (
                          <button key={idx} onClick={() => { handleDispensaToggle(disp); limparErro('dispensas'); }} disabled={isDisabled} type="button" role="checkbox" aria-checked={isSelected} className={`flex items-center text-left px-3 min-h-[44px] rounded-lg border text-sm transition-colors ${isSelected ? 'bg-thead border-navy text-navy font-bold' : isDisabled ? 'bg-thead border-line text-ink-4 cursor-not-allowed' : 'bg-white border-line text-ink hover:border-navy'}`}>
                            <span className={`w-4 h-4 rounded shrink-0 mr-3 flex items-center justify-center border ${isSelected ? 'bg-navy border-navy' : 'border-ink-4 bg-white'}`}>{isSelected && <CheckCircle2 size={12} strokeWidth={3} className="text-white" aria-hidden="true" />}</span>
                            <span>{disp}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <ChoiceGroup<'SIM' | 'NAO'>
                label="VDF (Verificação de Deficiência Funcional)" required error={erros.vdf}
                value={vdf === null ? '' : vdf ? 'SIM' : 'NAO'}
                onChange={v => { setVdf(v === 'SIM'); limparErro('vdf'); }}
                options={[{ value: 'SIM', label: 'Sim' }, { value: 'NAO', label: 'Não' }]}
              />
              {isLoadingLookups ? (
                <p className="text-xs text-ink-3" role="status">Carregando peritos…</p>
              ) : (
                <ChoiceGroup<string>
                  label="Perito" required error={erros.perito} value={selectedPerito}
                  onChange={v => { setSelectedPerito(v); limparErro('perito'); }}
                  options={peritosDisponiveis.map(p => ({ value: p.PERITO, label: p.PERITO }))}
                />
              )}
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mt-5 bg-canvas/95 backdrop-blur border-t border-line flex flex-col-reverse sm:flex-row sm:justify-between gap-2 z-10">
          <Button variant="secondary" icon="restart_alt" onClick={handleReset}>Limpar</Button>
          <Button icon="send" loading={isSubmitting} onClick={handleSubmit}>{isSubmitting ? 'Gerando perícia menor…' : 'Gerar perícia menor'}</Button>
        </div>
      </Container>
      )}

      {/* Busca de militar por nome */}
      {showPesquisarNomeModal && (
        <Dialog title="Pesquisar militar" icon="person_search" onClose={() => setShowPesquisarNomeModal(false)}>
          <div className="space-y-3">
            <input type="search" aria-label="Nome do militar" autoFocus value={pesquisarNomeTerm} onChange={e => setPesquisarNomeTerm(e.target.value)} placeholder="Ex.: João da Silva" className={controlClass} autoComplete="off" />
            <div className="max-h-72 overflow-y-auto border border-line rounded-lg" role="listbox" aria-label="Militares encontrados">
              {isCarregandoMilitares ? (
                <p className="p-6 text-center text-ink-3" role="status">Carregando base de dados…</p>
              ) : !pesquisarNomeTerm.trim() ? (
                <p className="p-6 text-center text-ink-3">Digite para buscar.</p>
              ) : resultadosNome.length === 0 ? (
                <p className="p-6 text-center text-ink-3">Nenhum militar encontrado.</p>
              ) : resultadosNome.slice(0, 50).map((m, idx) => (
                <button key={idx} type="button" role="option" aria-selected={false} onClick={() => selecionarNomeNip(m.nip)} className="w-full text-left px-4 py-2 min-h-[44px] border-b border-line last:border-b-0 hover:bg-thead">
                  <span className="block font-bold text-navy text-sm">{m.nome}</span>
                  <span className="block text-xs text-ink-3 font-mono">{m.nip}</span>
                </button>
              ))}
            </div>
          </div>
        </Dialog>
      )}

      {showConfirm && (
        <ConfirmDialog title="Gerar perícia menor" message="Confirma a geração da perícia menor? O PDF será salvo no Drive e a planilha atualizada." confirmLabel="Gerar perícia menor" onConfirm={executeSubmit} onCancel={() => setShowConfirm(false)} />
      )}

      {/* Recorte do atestado */}
      {showCropModal && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-label="Recortar atestado">
          <div className="p-4 bg-black flex justify-between items-center text-white shrink-0 border-b border-white/20"><h2 className="font-bold flex items-center gap-2 text-sm"><CropIcon size={20} className="text-gold" aria-hidden="true" /> Recortar atestado</h2><button type="button" aria-label="Fechar" onClick={() => { setShowCropModal(false); setImgSrc(''); }} className="w-11 h-11 flex items-center justify-center text-white/80 hover:text-white"><X size={24} /></button></div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">{imgSrc && (<ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)}><img ref={imgRef} src={imgSrc} alt="Atestado a recortar" style={{ maxHeight: '70vh', objectFit: 'contain' }} /></ReactCrop>)}</div>
          <div className="p-4 bg-black shrink-0 pb-10"><p className="text-white/70 text-sm text-center mb-4">Arraste os cantos para selecionar nome, datas e o CID.</p><Button fullWidth icon="check" onClick={handleCropComplete}>Confirmar recorte</Button></div>
        </div>
      )}

      {activeTab === 'historico' && canHistorico && (
        <Container size="data" className="pb-10 space-y-4">
          <div className="bg-white rounded-xl border border-line p-4 space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
              <input type="search" aria-label="Buscar por nome ou NIP" placeholder="Buscar por nome ou NIP…" value={historySearch} onChange={e => setHistorySearch(e.target.value)} className={`${controlClass} pl-10`} autoComplete="off" />
            </div>
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
              <Segmented
                ariaLabel="Situação da perícia"
                className="overflow-x-auto"
                value={statusFiltro}
                onChange={definirStatusFiltro}
                options={[
                  { value: 'vigentes', label: 'Vigentes', badge: vigentesTotal },
                  { value: 'concluidas', label: 'Concluídas', badge: concluidosTotal },
                  { value: 'todas', label: 'Todas' },
                ]}
              />
              <Segmented
                ariaLabel="Tipo de dispensa"
                className="overflow-x-auto"
                value={tipoFiltro}
                onChange={definirTipoFiltro}
                options={[
                  { value: 'todos', label: 'Todos os tipos' },
                  { value: 'lts', label: 'LTS', badge: ltsTotal },
                  { value: 'restricoes', label: 'Restrições', badge: restricoesTotal },
                ]}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line overflow-clip">
            {isFetchingHistory ? (
              <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando histórico…</p>
            ) : filteredHistory.length === 0 ? (
              <EmptyState icon="personal_injury" title="Nenhum registro encontrado" description="Ajuste a busca ou os filtros de situação e tipo." />
            ) : (
              <>
                {/* Mobile: duas linhas por registro */}
                <ul className="md:hidden divide-y divide-line">
                  {filteredHistory.map((rec, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => setSelectedPerson(rec.inspecionado)} className="w-full text-left px-4 py-3 min-h-[56px] hover:bg-thead flex items-start gap-2">
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-navy break-words">{rec.inspecionado}</span>
                          <span className="block text-xs text-ink-3 mt-0.5">{rec.dataAtestado}{rec.tempoHomolog ? ` · ${String(rec.tempoHomolog).replace(/^(\d+)$/, '$1 dias')}` : ''}{rec.cid ? ` · ${rec.cid}` : ''}</span>
                          <span className="block mt-1.5"><PericiaStatusTags registro={rec} /></span>
                        </span>
                        <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0 mt-0.5" aria-hidden="true">chevron_right</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                      <tr>
                        <th scope="col" aria-sort={ariaSort('data')} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                          <button type="button" onClick={() => handleSort('data')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">Data do atestado<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('data')}</span></button>
                        </th>
                        <th scope="col" aria-sort={ariaSort('inspecionado')} className="px-4 py-3 text-left font-semibold">
                          <button type="button" onClick={() => handleSort('inspecionado')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">Inspecionado<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('inspecionado')}</span></button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">CID</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Homologado</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Situação</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold"><span className="sr-only">Ação</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredHistory.map((rec, i) => (
                        <tr key={i} className="hover:bg-thead transition-colors">
                          <td className="px-4 py-3 align-top whitespace-nowrap text-ink-2">{rec.dataAtestado}</td>
                          <td className="px-4 py-3 align-top font-semibold text-navy">{rec.inspecionado}</td>
                          <td className="px-4 py-3 align-top text-ink-2">{rec.cid || '—'}</td>
                          <td className="px-4 py-3 align-top text-ink-2 whitespace-nowrap">{rec.tempoHomolog ? String(rec.tempoHomolog).replace(/^(\d+)$/, '$1 dias') : '—'}</td>
                          <td className="px-4 py-3 align-top"><PericiaStatusTags registro={rec} /></td>
                          <td className="px-4 py-2 align-top text-right">
                            <button type="button" onClick={() => setSelectedPerson(rec.inspecionado)} className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm font-bold text-navy hover:underline">
                              Ver histórico<span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          {filteredHistory.length > 0 && <p className="text-center text-xs text-ink-3" role="status">{filteredHistory.length} registro{filteredHistory.length !== 1 ? 's' : ''}</p>}
        </Container>
      )}
    </div>
  );
};
