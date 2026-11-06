// Ficheiro: components/periciaMenor/NovaPericiaMenorForm.tsx
// "Nova perícia menor" ("Novo atestado" para user_medicos_geral): barra lateral à direita (desktop)
// ou bottom sheet (mobile). Os campos aparecem aos poucos, cada um quando o anterior é preenchido:
//   1. "Registrar Atestado" ou "Homologar Atestado" (atestado externo apresentado para homologação);
//   2. Foto do atestado (obrigatória): recorte → filtro "Documento" → leitura automática pelo Gemini
//      (militar, data, tempo, CID e, na homologação, médico emissor e CRM). Se a leitura falhar, os
//      campos são preenchidos à mão e a foto é mantida;
//   3. Militar (autocomplete na base, cadastro rápido) e Serviço do HNRe;
//   4. Dados do atestado: data (dd/mm/aaaa), tempo, [tempo homologado], CID, dispensas, ENC p/ VDF (Sim/Não).
// Depois da foto (lida ou não), os campos surgem já preenchidos com o que a leitura trouxe; um campo
// revelado não volta a sumir. "Registrar" só habilita depois de escolher Sim ou Não em ENC p/ VDF.
// Tempo: sem homologação, o tempo do atestado é o tempo de dispensa (máx. 20 dias); com homologação,
// vale o tempo homologado (máx. 20). Somado às perícias do militar vigentes ou concluídas há até
// 10 dias, não passa de 30 (utils/periciaMenorRegras.ts).
// Ao registrar: a foto (já filtrada) vira PDF no Storage e a perícia é gravada no Firestore.
// A foto é obrigatória (FOTO_OBRIGATORIA = true): os campos só aparecem depois dela processada.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { MilitarCadastroForm } from '../militares/MilitarCadastroForm';
import { RecorteAtestado } from './RecorteAtestado';
import { DispensasModal } from './DispensasModal';
import { ServicoMilitarForm } from './ServicoMilitarForm';
import { useNav } from '../../context/NavContext';
import { extrairDadosAtestado } from '../../services/atestadoIA';
import { observarMilitares, type MilitarRecord } from '../../services/firestoreMilitares';
import { enviarPdfPericiaMenor, novoIdPericiaMenor, observarPericiasDoMilitar, registrarPericiaMenor, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { carregarCid, normalizarBusca, omEhHnre, type CidItem } from '../../utils/corposQuadros';
import { imagemParaPdf } from '../../utils/imagemParaPdf';
import { aplicarFiltroDocumento } from '../../utils/filtroDocumento';
import { dataCivilISO, hojeISO } from '../../utils/dados';
import { MAX_DIAS_PERICIA, MAX_DIAS_ACUMULADOS, limitarDias, saldoAcumulado } from '../../utils/periciaMenorRegras';
import { formatNip } from '../../utils/format';

interface Props {
  /** "Nova perícia menor" ou "Novo atestado" (perfil user_medicos_geral). */
  titulo?: string;
  onClose: () => void;
  onRegistrado: (nome: string) => void;
}

type Erros = Record<string, string>;
type Modo = '' | 'registrar' | 'homologar';
/** Etapas reveladas em sequência, depois da escolha Registrar/Homologar. */
type Etapa = 'foto' | 'militar' | 'data' | 'tempo' | 'tempoHomologado' | 'cid' | 'dispensas' | 'vdf';

/** Foto do atestado obrigatória? Voltou a ser (pedido de 06/11/2026). Com false, a foto fica opcional
 * (aparece "Continuar sem foto" e o pdfUrl pode ficar vazio). */
const FOTO_OBRIGATORIA = true;

const comUnidade = (v: string): string => (v ? `${v} dia${Number(v) > 1 ? 's' : ''}` : v);
const digitos = (v: string) => v.replace(/\D/g, '');
const rotuloCid = (c: CidItem) => `${c.SUBCAT} - ${c.DESCRICAO}`;

/** Aviso discreto, vermelho e à direita, logo abaixo do campo. */
const AvisoMax: React.FC<{ visivel: boolean }> = ({ visivel }) =>
  visivel ? <p role="status" className="mt-1 text-right text-xs font-semibold text-wine">Máx {MAX_DIAS_PERICIA} dias</p> : null;

export const NovaPericiaMenorForm: React.FC<Props> = ({ titulo = 'Nova perícia menor', onClose, onRegistrado }) => {
  const nav = useNav();
  const usuario = nav?.authUser;
  const [hoje] = useState(() => hojeISO());

  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [cids, setCids] = useState<CidItem[]>([]);

  const [modo, setModo] = useState<Modo>('');
  const homologacao = modo === 'homologar';
  const [semFoto, setSemFoto] = useState(false);
  const [revelados, setRevelados] = useState<ReadonlySet<Etapa>>(() => new Set());

  const [militarId, setMilitarId] = useState('');
  const [militarTexto, setMilitarTexto] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [recemCadastradoId, setRecemCadastradoId] = useState('');
  const [editandoServico, setEditandoServico] = useState(false);
  const [anteriores, setAnteriores] = useState<PericiaMenorRecord[]>([]);

  const [dataTexto, setDataTexto] = useState('');
  const [tempoAtestado, setTempoAtestado] = useState('');
  const [avisoMaxAtestado, setAvisoMaxAtestado] = useState(false);
  const [tempoHomologado, setTempoHomologado] = useState('');
  const [avisoMaxHomologado, setAvisoMaxHomologado] = useState(false);
  const [cid, setCid] = useState<CidItem | null>(null);
  const [cidTexto, setCidTexto] = useState('');
  const [dispensas, setDispensas] = useState<string[]>([]);
  const [escolhendoDispensas, setEscolhendoDispensas] = useState(false);
  const [vdf, setVdf] = useState<'' | 'sim' | 'nao'>('');
  // Médico emissor e CRM (atestado externo): aparecem só na homologação e se a leitura os trouxe.
  const [medicoEmissor, setMedicoEmissor] = useState('');
  const [crmEmissor, setCrmEmissor] = useState('');
  const [emissorLido, setEmissorLido] = useState(false);

  const [imagemBruta, setImagemBruta] = useState('');
  const [imagemDoc, setImagemDoc] = useState('');
  const [processando, setProcessando] = useState<'' | 'filtro' | 'leitura'>('');
  const [falhaLeitura, setFalhaLeitura] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);

  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));

  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => { carregarCid().then(setCids).catch(() => setCids([])); }, []);
  const militar = militares.find(m => m.id === militarId) ?? null;
  // Perícias anteriores do militar escolhido, para o limite de 30 dias acumulados.
  useEffect(() => {
    setAnteriores([]);
    if (!militarId) return;
    return observarPericiasDoMilitar(militarId, setAnteriores, () => setAnteriores([]));
  }, [militarId]);
  // O Serviço do HNRe só existe para militares da OM HNRe; para as demais OMs o campo some e nada é gravado.
  const servicoAplicavel = !!militar && omEhHnre(militar.om);
  const selecionarMilitar = (m: MilitarRecord) => { setMilitarId(m.id); setMilitarTexto(m.inspecionado); limpar('militar'); };

  // Militar recém-cadastrado: assim que aparece na lista, já vem preenchido.
  useEffect(() => {
    if (!recemCadastradoId) return;
    const m = militares.find(x => x.id === recemCadastradoId);
    if (m) { selecionarMilitar(m); setRecemCadastradoId(''); }
  }, [recemCadastradoId, militares]); // eslint-disable-line react-hooks/exhaustive-deps

  const opcoesMilitar: OpcaoAutocomplete[] = useMemo(() => militares.map(m => ({
    chave: m.id, principal: m.nome, secundaria: `${m.pgq} · ${formatNip(m.nip)} · ${m.om}`,
    busca: normalizarBusca(`${m.inspecionado} ${m.om} ${m.id}`), // m.id = NIP só com dígitos: dá para buscar sem os pontos
  })), [militares]);
  const opcoesCid: OpcaoAutocomplete[] = useMemo(() => cids.map(c => ({
    chave: c.SUBCAT, principal: c.DESCRABREV, secundaria: c.DESCRICAO, busca: normalizarBusca(`${c.SUBCAT} ${c.DESCRABREV} ${c.DESCRICAO}`),
  })), [cids]);

  // "Cadastrar novo militar" só aparece quando a busca não encontra ninguém.
  const buscaSemResultado = useMemo(() => {
    if (militar || !militarTexto.trim()) return false;
    const termos = normalizarBusca(militarTexto).split(/\s+/).filter(Boolean);
    return !opcoesMilitar.some(o => termos.every(t => (o.busca ?? '').includes(t)));
  }, [militar, militarTexto, opcoesMilitar]);

  // ---- Tempo: o que conta para a dispensa e o limite de 30 dias acumulados ----
  const tempoEfetivo = Number(digitos(homologacao ? tempoHomologado : tempoAtestado)) || 0;
  const saldo = useMemo(() => saldoAcumulado(anteriores, hoje), [anteriores, hoje]);
  const passaDe30 = saldo.quantidade > 0 && tempoEfetivo > 0 && saldo.usados + tempoEfetivo > MAX_DIAS_ACUMULADOS;
  // Aviso quando há atestado recente (vigente ou concluído há até 10 dias — utils/periciaMenorRegras.ts): os dias já usados.
  // O limite de MAX_DIAS_ACUMULADOS continua validado no campo de tempo (erro ao passar).
  const msgAcumulado = saldo.quantidade > 0
    ? `O inspecionado(a) teve ${saldo.usados} dia${saldo.usados !== 1 ? 's' : ''} de atestados no último mês.`
    : '';

  const alterarTempoAtestado = (texto: string, homolog = homologacao) => {
    const r = limitarDias(texto, homolog ? undefined : MAX_DIAS_PERICIA);
    setTempoAtestado(r.valor); setAvisoMaxAtestado(r.cortado); limpar('tempoAtestado');
  };
  const alterarTempoHomologado = (texto: string) => {
    const r = limitarDias(texto, MAX_DIAS_PERICIA);
    setTempoHomologado(r.valor); setAvisoMaxHomologado(r.cortado); limpar('tempoHomologado');
  };
  const escolherModo = (m: Exclude<Modo, ''>) => {
    const marcado = m === 'homologar';
    setModo(m);
    // Sem homologação, o tempo do atestado volta ao limite de 20 dias.
    if (!marcado && tempoAtestado) alterarTempoAtestado(tempoAtestado, false);
    if (!marcado) { setTempoHomologado(''); setAvisoMaxHomologado(false); limpar('tempoHomologado'); }
  };

  // ---- Foto do atestado: recorte → filtro "Documento" → leitura automática ----
  const aoEscolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => setImagemBruta(String(leitor.result || ''));
    leitor.readAsDataURL(f);
  };

  const aplicarDados = (dados: Awaited<ReturnType<typeof extrairDadosAtestado>>) => {
    const iso = dados.dataAtestado ? dataCivilISO(String(dados.dataAtestado)) : null;
    if (iso) { setDataTexto(dataBR(iso)); limpar('dataAtestado'); }
    if (dados.tempoAtestado) alterarTempoAtestado(String(dados.tempoAtestado));
    if (dados.cid) {
      const codigo = String(dados.cid).toLowerCase().replace(/[^a-z0-9]/g, '');
      const achado = cids.find(c => c.SUBCAT.toLowerCase() === codigo) ?? cids.find(c => c.SUBCAT.toLowerCase().startsWith(codigo));
      if (achado) { setCid(achado); setCidTexto(rotuloCid(achado)); limpar('cid'); } else { setCid(null); setCidTexto(String(dados.cid)); }
    }
    if (dados.nomeMilitar) {
      const termos = normalizarBusca(String(dados.nomeMilitar)).split(/\s+/).filter(Boolean);
      const achados = militares.filter(m => { const alvo = normalizarBusca(m.inspecionado); return termos.every(t => alvo.includes(t)); });
      if (achados.length === 1) selecionarMilitar(achados[0]);
      else { setMilitarId(''); setMilitarTexto(String(dados.nomeMilitar)); }
    }
    const medico = String(dados.medicoEmissor || '').trim();
    const crm = String(dados.crmEmissor || '').trim();
    setMedicoEmissor(medico); setCrmEmissor(crm); setEmissorLido(!!(medico || crm));
  };

  const aoConfirmarRecorte = async (recortada: string) => {
    setImagemBruta('');
    setFalhaLeitura('');
    limpar('foto');
    setProcessando('filtro');
    let doc = recortada;
    try { doc = await aplicarFiltroDocumento(recortada); } catch { /* sem filtro, segue com a foto recortada */ }
    setImagemDoc(doc);
    setProcessando('leitura');
    try {
      aplicarDados(await extrairDadosAtestado(doc.split(',')[1]));
    } catch (err: any) {
      setFalhaLeitura(`${err?.message || 'Não foi possível ler o atestado.'} Preencha os campos abaixo; a foto será arquivada.`);
    } finally {
      setProcessando('');
    }
  };

  // ---- Envio ----
  const dataAtestado = dataCivilISO(dataTexto) || '';

  // ---- Revelação progressiva: visível até a primeira etapa pendente; o que já apareceu não some ----
  const etapas: Etapa[] = modo ? ['foto', 'militar', 'data', 'tempo', ...(homologacao ? ['tempoHomologado' as const] : []), 'cid', 'dispensas', 'vdf'] : [];
  const completa: Record<Etapa, boolean> = {
    foto: (!!imagemDoc && !processando) || semFoto,
    militar: !!militar, data: !!dataAtestado, tempo: !!digitos(tempoAtestado), tempoHomologado: !!digitos(tempoHomologado),
    cid: !!cid, dispensas: dispensas.length > 0, vdf: vdf !== '',
  };
  const pendente = etapas.findIndex(e => !completa[e]);
  const atingidas = etapas.slice(0, pendente < 0 ? etapas.length : pendente + 1);
  const chaveAtingidas = atingidas.join();
  useEffect(() => {
    const novas = atingidas.filter(e => !revelados.has(e));
    if (novas.length === 0) return;
    setRevelados(prev => new Set([...prev, ...novas]));
    // Traz à vista o campo que acabou de surgir (só rola se estiver fora da tela).
    const ultima = novas[novas.length - 1];
    if (ultima !== 'foto') requestAnimationFrame(() => document.querySelector(`#form-nova-pericia [data-etapa="${ultima}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }, [chaveAtingidas]); // eslint-disable-line react-hooks/exhaustive-deps
  const ver = (e: Etapa) => !!modo && (atingidas.includes(e) || revelados.has(e));
  const validar = (): Erros => {
    const e: Erros = {};
    if (FOTO_OBRIGATORIA && !imagemDoc) e.foto = 'Fotografe o atestado.';
    if (!militar) e.militar = 'Escolha o militar na lista.';
    if (!dataTexto) e.dataAtestado = 'Informe a data do atestado.';
    else if (!dataAtestado) e.dataAtestado = 'Data inválida (dd/mm/aaaa).';
    if (!digitos(tempoAtestado)) e.tempoAtestado = 'Informe o tempo do atestado.';
    if (homologacao && !digitos(tempoHomologado)) e.tempoHomologado = 'Informe o tempo homologado.';
    if (!cid) e.cid = 'Escolha o CID na lista.';
    if (dispensas.length === 0) e.dispensas = 'Selecione ao menos uma dispensa.';
    if (!vdf) e.vdf = 'Informe se encaminha para VDF.';
    if (passaDe30) e[homologacao ? 'tempoHomologado' : 'tempoAtestado'] = `Total acima de ${MAX_DIAS_ACUMULADOS} dias com o registro anterior: máximo agora ${saldo.restante} dia${saldo.restante !== 1 ? 's' : ''}.`;
    return e;
  };

  const registrar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#form-nova-pericia [aria-invalid="true"]')?.focus());
      return;
    }
    if (!militar || !cid || !usuario) return;
    setSalvando(true);
    try {
      const id = novoIdPericiaMenor();
      const pdfUrl = imagemDoc ? await enviarPdfPericiaMenor(id, await imagemParaPdf(imagemDoc)) : '';
      const medico = medicoEmissor.trim();
      const crm = crmEmissor.trim();
      await registrarPericiaMenor(id, {
        militarId: militar.id, inspecionado: militar.inspecionado, om: militar.om,
        ...(servicoAplicavel && militar.servico_label ? { servico: militar.servico_label } : {}),
        cid: rotuloCid(cid), dispensas, dataAtestado,
        tempoAtestado: Number(digitos(tempoAtestado)),
        // O que conta para a dispensa: o homologado (na homologação) ou o próprio tempo do atestado.
        tempoHomologado: tempoEfetivo,
        homologacao,
        ...(homologacao && medico ? { medicoEmissor: medico } : {}),
        ...(homologacao && crm ? { crmEmissor: crm } : {}),
        vdf: vdf === 'sim', peritoUsuario: usuario.usuario, peritoNome: usuario.nome, peritoUid: usuario.uid, pdfUrl,
      });
      onRegistrado(militar.nome);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível registrar.' });
      setSalvando(false);
    }
  };

  const resumoDispensas = dispensas.length === 0 ? 'Selecione as dispensas…' : dispensas.join(', ');
  const secao = 'font-heading font-bold text-navy text-base';
  // Campo de dias: só números ao digitar; "N dias" ao sair do campo.
  const tempoField = (rotulo: string, valor: string, setValor: React.Dispatch<React.SetStateAction<string>>, erro: string | undefined, aviso: boolean, aoMudar: (t: string) => void) => (
    <div>
      <Field label={rotulo} required error={erro}>
        {a => (
          <input {...a} type="text" inputMode="numeric" placeholder="Dias" value={valor}
            onChange={e => aoMudar(e.target.value)}
            onBlur={() => setValor(t => comUnidade(digitos(t)))}
            onFocus={() => setValor(t => digitos(t))} />
        )}
      </Field>
      <AvisoMax visivel={aviso && !erro} />
    </div>
  );

  return (
    <>
      <Drawer
        title={titulo}
        icon="personal_injury"
        onClose={() => { if (!salvando) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button type="submit" form="form-nova-pericia" icon="check" loading={salvando} disabled={!!processando || !vdf}>Registrar</Button>
          </>
        )}
      >
        <form id="form-nova-pericia" onSubmit={registrar} noValidate className="space-y-6">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <ChoiceGroup
            label="Tipo de registro" ocultarRotulo emLinha value={modo} onChange={escolherModo}
            options={[{ value: 'registrar', label: 'Registrar Atestado' }, { value: 'homologar', label: 'Homologar Atestado' }]}
          />

          {ver('foto') && <section data-etapa="foto" className="space-y-2 animate-fade-in" aria-labelledby="pm-foto">
            <h3 id="pm-foto" className={secao}>Fotografar atestado{FOTO_OBRIGATORIA && <><span className="text-wine ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (obrigatório)</span></>}</h3>
            <input type="file" accept="image/*" capture="environment" ref={arquivo} onChange={aoEscolherArquivo} className="hidden" />
            {!imagemDoc && !processando ? (
              <Button variant="secondary" icon="photo_camera" onClick={() => arquivo.current?.click()} aria-invalid={!!erros.foto || undefined} aria-describedby={erros.foto ? 'pm-foto-erro' : undefined}>Fotografar atestado</Button>
            ) : (
              <div className="relative rounded-lg border border-line bg-white overflow-hidden">
                {imagemDoc
                  ? <img src={imagemDoc} alt="Atestado fotografado (filtro Documento)" className="w-full max-h-[55vh] object-contain bg-white" />
                  : <div className="h-48" aria-hidden="true" />}
                {processando && (
                  <div className="absolute inset-0 bg-white/75 flex items-center justify-center gap-2 text-sm font-bold text-navy" role="status">
                    <span className="w-5 h-5 border-2 border-navy/20 border-t-navy rounded-full animate-spin" aria-hidden="true" />
                    {processando === 'filtro' ? 'Tratando a foto…' : 'Lendo o atestado…'}
                  </div>
                )}
                {!processando && (
                  <button
                    type="button" onClick={() => arquivo.current?.click()} aria-label="Refazer foto do atestado" title="Refazer foto"
                    className="group absolute bottom-1 right-1 w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <span className="w-8 h-8 rounded-full bg-navy/60 group-hover:bg-navy text-white flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">restart_alt</span>
                    </span>
                  </button>
                )}
              </div>
            )}
            {erros.foto && <p id="pm-foto-erro" role="alert" className="text-xs font-semibold text-wine">{erros.foto}</p>}
            {falhaLeitura && <p role="status" className="text-xs font-semibold text-wine">{falhaLeitura}</p>}
            {!FOTO_OBRIGATORIA && !imagemDoc && !processando && !semFoto && (
              <button type="button" onClick={() => setSemFoto(true)} className="ml-4 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy underline underline-offset-2 hover:text-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                Continuar sem foto
              </button>
            )}
          </section>}

          {ver('militar') && <section data-etapa="militar" className="space-y-4 animate-fade-in" aria-labelledby="pm-militar">
            <h3 id="pm-militar" className={secao}>Dados do militar</h3>
            <div>
              <Autocomplete
                label="Nome" required error={erros.militar}
                placeholder="Digite o nome ou o NIP do militar"
                valor={militarTexto} opcoes={opcoesMilitar}
                onDigitar={t => { setMilitarTexto(t); setMilitarId(''); limpar('militar'); }}
                onSelecionar={o => { const m = militares.find(x => x.id === o.chave); if (m) selecionarMilitar(m); }}
              />
              {buscaSemResultado && (
                <button type="button" onClick={() => setCadastrando(true)} className="mt-1 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy underline underline-offset-2 hover:text-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
                  Militar não encontrado? Cadastrar novo militar
                </button>
              )}
            </div>
            {servicoAplicavel && (
              <div>
                <Field label="Serviço do HNRe">
                  {a => <input {...a} type="text" readOnly disabled value={militar?.servico_label || ''} placeholder="Sem serviço cadastrado" />}
                </Field>
                {!militar?.servico_label && (
                  <button type="button" onClick={() => setEditandoServico(true)} className="mt-1 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy underline underline-offset-2 hover:text-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">apartment</span>
                    Cadastrar Serviço
                  </button>
                )}
              </div>
            )}
          </section>}

          {ver('data') && <section data-etapa="data" className="space-y-4 animate-fade-in" aria-labelledby="pm-atestado">
            <h3 id="pm-atestado" className={secao}>Dados do atestado</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data do atestado" required error={erros.dataAtestado}>
                {a => (
                  // Seletor de data nativo (calendário/rolagem do aparelho) sob uma "casca" que mostra dd/mm/aaaa:
                  // o input nativo cobre o campo, transparente — no iPhone o formato longo não estoura a largura.
                  <div className="relative group">
                    <div aria-hidden="true" className={`${a.className} flex items-center justify-between gap-2 pointer-events-none group-focus-within:border-navy group-focus-within:ring-1 group-focus-within:ring-navy`}>
                      <span className={dataTexto ? 'text-ink' : 'text-ink-4'}>{dataTexto || 'dd/mm/aaaa'}</span>
                      <span className="material-symbols-outlined text-[20px] text-ink-3">calendar_month</span>
                    </div>
                    <input
                      {...a} type="date" max={hoje} value={dataAtestado}
                      onChange={e => { setDataTexto(dataBR(e.target.value)); limpar('dataAtestado'); }}
                      onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sem showPicker: o navegador abre o seletor sozinho */ } }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                    />
                  </div>
                )}
              </Field>
              {ver('tempo') && <div data-etapa="tempo" className="animate-fade-in">{tempoField('Tempo do atestado', tempoAtestado, setTempoAtestado, erros.tempoAtestado, avisoMaxAtestado && !homologacao, alterarTempoAtestado)}</div>}
              {homologacao && ver('tempoHomologado') && <div data-etapa="tempoHomologado" className="animate-fade-in">{tempoField('Tempo homologado', tempoHomologado, setTempoHomologado, erros.tempoHomologado, avisoMaxHomologado, alterarTempoHomologado)}</div>}
            </div>
            {ver('tempo') && msgAcumulado && !erros.tempoAtestado && !erros.tempoHomologado && (
              <p className={`text-xs ${passaDe30 ? 'font-semibold text-wine' : 'text-ink-3'}`} role={passaDe30 ? 'alert' : undefined}>{msgAcumulado}</p>
            )}
            {homologacao && emissorLido && ver('cid') && (
              <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-4">
                <Field label="Médico" help="Emissor do atestado (lido da foto; corrija se preciso).">
                  {a => <input {...a} type="text" value={medicoEmissor} onChange={e => setMedicoEmissor(e.target.value)} />}
                </Field>
                <Field label="CRM">
                  {a => <input {...a} type="text" value={crmEmissor} onChange={e => setCrmEmissor(e.target.value)} />}
                </Field>
              </div>
            )}
            {ver('cid') && <div data-etapa="cid" className="animate-fade-in"><Autocomplete
              label="CID" required error={erros.cid} placeholder="Digite o código ou a descrição do CID"
              valor={cidTexto} opcoes={opcoesCid}
              onDigitar={t => { setCidTexto(t); setCid(null); limpar('cid'); }}
              onSelecionar={o => { const c = cids.find(x => x.SUBCAT === o.chave); if (c) { setCid(c); setCidTexto(rotuloCid(c)); limpar('cid'); } }}
            /></div>}
            {ver('dispensas') && <div data-etapa="dispensas" className="animate-fade-in"><Field label="Dispensas" required error={erros.dispensas}>
              {a => (
                <button
                  id={a.id} type="button" onClick={() => setEscolhendoDispensas(true)} aria-haspopup="dialog"
                  aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']}
                  className={`${a.className} flex items-center justify-between gap-2 text-left`}
                >
                  <span className={`truncate ${dispensas.length > 0 ? 'text-navy font-semibold' : 'text-ink-4'}`}>{resumoDispensas}</span>
                  <span className="material-symbols-outlined text-[20px] text-ink-3 shrink-0" aria-hidden="true">checklist</span>
                </button>
              )}
            </Field></div>}
            {ver('vdf') && (
              <div data-etapa="vdf" className="animate-fade-in">
                <ChoiceGroup
                  label="ENC p/ VDF?" required emLinha value={vdf} error={erros.vdf}
                  onChange={v => { setVdf(v); limpar('vdf'); }}
                  options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
                />
              </div>
            )}
          </section>}
        </form>
      </Drawer>

      {imagemBruta && (
        <RecorteAtestado
          imagem={imagemBruta}
          onCancelar={() => setImagemBruta('')}
          onConfirmar={url => { void aoConfirmarRecorte(url); }}
        />
      )}
      {escolhendoDispensas && (
        <DispensasModal
          inicial={dispensas}
          onCancelar={() => setEscolhendoDispensas(false)}
          onConfirmar={lista => { setDispensas(lista); limpar('dispensas'); setEscolhendoDispensas(false); }}
        />
      )}
      {cadastrando && (
        <MilitarCadastroForm
          onClose={() => setCadastrando(false)}
          onCriado={(_nome, id) => { setCadastrando(false); setRecemCadastradoId(id); }}
        />
      )}
      {editandoServico && militar && (
        <ServicoMilitarForm militar={militar} onClose={() => setEditandoServico(false)} onSalvo={() => setEditandoServico(false)} />
      )}
    </>
  );
};
