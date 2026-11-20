// Ficheiro: components/periciaMenor/NovaPericiaMenorForm.tsx
// "Nova perícia menor" ("Novo atestado" para user_medicos_geral): barra lateral à direita (desktop)
// ou bottom sheet (mobile). Abas no topo, todos os campos visíveis de uma vez:
//   - "Registrar atestado": militar, dados do atestado, ENC p/ VDF e, só para o Admin, "Perito
//     responsável" (select de médicos ativos que podem registrar, por NIP; padrão = o próprio Admin).
//     Sem foto (pdfUrl vazio).
//   - "Homologar atestado" (atestado externo): foto obrigatória — opcional só para o Admin (recorte → filtro "Documento" → leitura
//     pelo Gemini, que preenche militar, data, tempo, CID, médico emissor e CRM), tempo homologado.
// Gravação: peritoUid/peritoNome/peritoUsuario = perito responsável (o escolhido pelo Admin ou quem
// registra); criadoPor/criadoPorUsuario = quem registrou. Na homologação a foto vira PDF no Storage.
// Tempo: sem homologação, o tempo do atestado é o tempo de dispensa (máx. 20 dias); com homologação,
// vale o tempo homologado (máx. 20). Somado às perícias do militar vigentes ou concluídas há até
// 10 dias, não passa de 30 (utils/periciaMenorRegras.ts).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CascaFormulario, type CascaForm } from '../ficha/CascaFormulario';
import { Button } from '../ui/Button';
import { AcoesRodape, submeterFormulario } from '../ui/AcoesRodape';
import { Field } from '../ui/Field';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { Segmented } from '../ui/Segmented';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { MilitarCadastroForm } from '../militares/MilitarCadastroForm';
import { RecorteAtestado } from './RecorteAtestado';
import { DispensasModal } from './DispensasModal';
import { ServicoMilitarForm } from './ServicoMilitarForm';
import { useNav } from '../../context/NavContext';
import { extrairDadosAtestado, transcreverAtestadoPM } from '../../services/atestadoIA';
import { logErroSeguro } from '../../utils/logSeguro';
import { categorizarPericiaEmSegundoPlano, especialidadeDoCid } from '../../services/especialidadePericiaIA';
import { observarMilitares, type MilitarRecord } from '../../services/firestoreMilitares';
import { editarPericiaMenor, enviarPdfPericiaMenor, gravarTranscricaoPericia, novoIdPericiaMenor, observarPericiasDoMilitar, registrarPericiaMenor, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { MIN_JUSTIFICATIVA_EXCLUSAO, erroJustificativaExclusao } from '../../utils/exclusaoPericia';
import { carregarPeritosPericiaMenor } from '../../services/periciaMenorService';
import { carregarCid, normalizarBusca, omEhHnre, type CidItem } from '../../utils/corposQuadros';
import { imagemParaPdf } from '../../utils/imagemParaPdf';
import { aplicarFiltroDocumento } from '../../utils/filtroDocumento';
import { dataCivilISO, diasInteiro, hojeISO, normalizarTexto } from '../../utils/dados';
import { MAX_DIAS_PERICIA, MAX_DIAS_ACUMULADOS, limitarDias, saldoAcumulado, type PeritoPericiaMenor } from '../../utils/periciaMenorRegras';
import { extrairNomeInspecionado, formatNip } from '../../utils/format';

interface Props {
  /** "Nova perícia menor" ou "Novo atestado" (perfil user_medicos_geral). */
  titulo?: string;
  onClose: () => void;
  onRegistrado: (nome: string) => void;
  /** Pré-preenchimento: id (NIP só dígitos) do militar — "Nova perícia para ele" (detalhe e Ficha do inspecionado). */
  militarInicial?: string;
  /** 'inline': no painel principal da Ficha do inspecionado (telas grandes); padrão: Drawer. */
  casca?: CascaForm;
  /**
   * EDIÇÃO de uma perícia já registrada (Admin, ou o perito responsável / quem registrou — utils/exclusaoPericia.ts):
   * o formulário vem preenchido, o inspecionado fica fixo, a foto/PDF não muda e, fora do Admin, a Justificativa
   * (≥ 10 caracteres) é obrigatória. Grava pelo servidor (services/firestorePericiasMenores.ts → editarPericiaMenor).
   */
  editar?: PericiaMenorRecord;
}

type Erros = Record<string, string>;
type Modo = 'registrar' | 'homologar';

const comUnidade = (v: string): string => (v ? `${v} dia${Number(v) > 1 ? 's' : ''}` : v);
const digitos = (v: string) => v.replace(/\D/g, '');
/** CID gravado no formato DESCRABREV do cid.json (ex.: "M54.5 Dor lombar baixa"), igual ao da IS. */
const rotuloCid = (c: CidItem) => c.DESCRABREV;
const rotuloPerito = (p: PeritoPericiaMenor) => `${p.usuario || p.nome}${p.nip ? ` — ${formatNip(p.nip)}` : ''}`;

/** Aviso discreto, vermelho e à direita, logo abaixo do campo. */
const AvisoMax: React.FC<{ visivel: boolean }> = ({ visivel }) =>
  visivel ? <p role="status" className="mt-1 text-right text-xs font-semibold text-wine">Máx {MAX_DIAS_PERICIA} dias</p> : null;

export const NovaPericiaMenorForm: React.FC<Props> = ({ titulo = 'Nova perícia menor', onClose, onRegistrado, militarInicial, casca = 'drawer', editar }) => {
  const edicao = !!editar;
  const nav = useNav();
  const usuario = nav?.authUser;
  const [hoje] = useState(() => hojeISO());

  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [cids, setCids] = useState<CidItem[]>([]);

  const [modo, setModo] = useState<Modo>(editar?.homologacao ? 'homologar' : 'registrar');
  const homologacao = modo === 'homologar';
  // Perito responsável: só o Admin escolhe (na aba Registrar); para os demais é o próprio usuário.
  const ehAdmin = usuario?.perfil === 'admin';
  const [peritos, setPeritos] = useState<PeritoPericiaMenor[]>([]);
  const [peritoUid, setPeritoUid] = useState(editar?.peritoUid || usuario?.uid || '');

  const [militarId, setMilitarId] = useState(editar?.militarId ?? '');
  const [militarTexto, setMilitarTexto] = useState(editar?.inspecionado ?? '');
  const [cadastrando, setCadastrando] = useState(false);
  const [recemCadastradoId, setRecemCadastradoId] = useState(militarInicial ?? '');
  const [editandoServico, setEditandoServico] = useState(false);
  const [anteriores, setAnteriores] = useState<PericiaMenorRecord[]>([]);

  const [dataTexto, setDataTexto] = useState(editar ? dataBR(editar.dataAtestado) : '');
  const [tempoAtestado, setTempoAtestado] = useState(editar ? comUnidade(String(editar.tempoAtestado || '')) : '');
  const [avisoMaxAtestado, setAvisoMaxAtestado] = useState(false);
  const [tempoHomologado, setTempoHomologado] = useState(editar?.homologacao ? comUnidade(String(editar.tempoHomologado || '')) : '');
  const [avisoMaxHomologado, setAvisoMaxHomologado] = useState(false);
  const [cid, setCid] = useState<CidItem | null>(null);
  const [cidTexto, setCidTexto] = useState(editar?.cid ?? '');
  const [dispensas, setDispensas] = useState<string[]>(editar?.dispensas ?? []);
  const [escolhendoDispensas, setEscolhendoDispensas] = useState(false);
  const [vdf, setVdf] = useState<'' | 'sim' | 'nao'>(editar ? (editar.vdf ? 'sim' : 'nao') : '');
  // Médico emissor e CRM (atestado externo): aparecem só na homologação e se a leitura os trouxe.
  const [medicoEmissor, setMedicoEmissor] = useState(editar?.medicoEmissor ?? '');
  const [crmEmissor, setCrmEmissor] = useState(editar?.crmEmissor ?? '');
  const [emissorLido, setEmissorLido] = useState(!!(editar?.medicoEmissor || editar?.crmEmissor));
  const [justificativa, setJustificativa] = useState('');

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
  // Edição: o CID gravado volta a ser o item da lista (pelo código; nos registros antigos, pelo rótulo).
  useEffect(() => {
    if (!editar || cid || !cids.length) return;
    const codigo = String(editar.cidCodigo || editar.cid.split(' ')[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const achado = cids.find(c => c.SUBCAT.toUpperCase() === codigo);
    if (achado) setCid(achado);
  }, [cids]); // eslint-disable-line react-hooks/exhaustive-deps
  // Especialidade pela IA em segundo plano assim que o CID é escolhido (nada aparece no formulário).
  useEffect(() => { if (cid) void especialidadeDoCid(cid.SUBCAT, rotuloCid(cid)); }, [cid]);
  useEffect(() => {
    if (!ehAdmin) return;
    let vivo = true;
    carregarPeritosPericiaMenor().then(l => { if (vivo) setPeritos(l); }).catch(() => { if (vivo) setPeritos([]); });
    return () => { vivo = false; };
  }, [ehAdmin]);
  // O próprio Admin sempre aparece no select (mesmo que a lista não carregue).
  const opcoesPerito = useMemo(() => {
    let l = !usuario || peritos.some(p => p.uid === usuario.uid)
      ? peritos
      : [{ uid: usuario.uid, usuario: usuario.usuario, nome: usuario.nome, nip: usuario.nip || '' }, ...peritos];
    // Edição: o perito gravado sempre aparece, mesmo fora da lista atual.
    if (editar?.peritoUid && !l.some(p => p.uid === editar.peritoUid)) {
      l = [{ uid: editar.peritoUid, usuario: editar.peritoUsuario, nome: editar.peritoNome, nip: '' }, ...l];
    }
    return l;
  }, [peritos, usuario, editar]);
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
  // Na edição, o próprio registro não conta no saldo (o tempo dele é o que está sendo editado).
  const saldo = useMemo(() => saldoAcumulado(editar ? anteriores.filter(a => a.id !== editar.id) : anteriores, hoje), [anteriores, hoje, editar]);
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
  const escolherModo = (m: Modo) => {
    const marcado = m === 'homologar';
    setModo(m);
    // Sem homologação, o tempo do atestado volta ao limite de 20 dias.
    if (!marcado && tempoAtestado) alterarTempoAtestado(tempoAtestado, false);
    if (!marcado) { setTempoHomologado(''); setAvisoMaxHomologado(false); limpar('tempoHomologado'); limpar('foto'); }
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
    // Dias como inteiro (convenção 19.5): "5", 5 ou "5 dias" → 5; fora de 0–36500 é ignorado.
    const dias = diasInteiro(String(dados.tempoAtestado ?? '').replace(/\D+$/, '').trim());
    if (dias) alterarTempoAtestado(String(dias));
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

  const validar = (): Erros => {
    const e: Erros = {};
    // Foto: obrigatória na homologação, exceto para o Admin (pode homologar sem anexar; fica sem PDF).
    if (homologacao && !imagemDoc && !ehAdmin && !edicao) e.foto = 'Anexe a foto do atestado.';
    if (!militar && !edicao) e.militar = 'Escolha o militar na lista.';
    if (edicao) { const j = erroJustificativaExclusao(justificativa, usuario?.perfil ?? ''); if (j) e.justificativa = j; }
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
    if (!cid || !usuario) return;
    if (editar) {
      const perito = (ehAdmin && opcoesPerito.find(p => p.uid === peritoUid)) || null;
      const medico = normalizarTexto(medicoEmissor);
      const crm = normalizarTexto(crmEmissor);
      setSalvando(true);
      try {
        await editarPericiaMenor(editar, {
          cid: rotuloCid(cid), cidCodigo: cid.SUBCAT, dispensas: dispensas.map(normalizarTexto), dataAtestado,
          tempoAtestado: Number(digitos(tempoAtestado)), tempoHomologado: tempoEfetivo, homologacao,
          medicoEmissor: homologacao ? medico : '', crmEmissor: homologacao ? crm : '', vdf: vdf === 'sim',
          ...(perito ? { peritoUid: perito.uid, peritoUsuario: perito.usuario, peritoNome: perito.nome } : {}),
        }, justificativa);
        if (normalizarCidCod(editar.cidCodigo) !== normalizarCidCod(cid.SUBCAT) || !editar.especialidade) categorizarPericiaEmSegundoPlano(editar.id, cid.SUBCAT, rotuloCid(cid));
        onRegistrado(extrairNomeInspecionado(editar.inspecionado));
      } catch (err: any) {
        setErros({ geral: err?.message || 'Não foi possível salvar as alterações.' });
        setSalvando(false);
      }
      return;
    }
    if (!militar) return;
    // Admin escolhe o perito responsável (pré-preenchido com ele mesmo) em registrar E em homologar.
    const perito = (ehAdmin && opcoesPerito.find(p => p.uid === peritoUid))
      || { uid: usuario.uid, usuario: usuario.usuario, nome: usuario.nome };
    setSalvando(true);
    try {
      const id = novoIdPericiaMenor();
      const pdfUrl = homologacao && imagemDoc ? await enviarPdfPericiaMenor(id, await imagemParaPdf(imagemDoc), militar.inspecionado) : '';
      const medico = normalizarTexto(medicoEmissor);
      const crm = normalizarTexto(crmEmissor);
      await registrarPericiaMenor(id, {
        militarId: militar.id, inspecionado: militar.inspecionado, om: militar.om,
        ...(servicoAplicavel && militar.servico_label ? { servico: militar.servico_label } : {}),
        cid: rotuloCid(cid), cidCodigo: cid.SUBCAT, dispensas: dispensas.map(normalizarTexto), dataAtestado,
        tempoAtestado: Number(digitos(tempoAtestado)),
        // O que conta para a dispensa: o homologado (na homologação) ou o próprio tempo do atestado.
        tempoHomologado: tempoEfetivo,
        homologacao,
        ...(homologacao && medico ? { medicoEmissor: medico } : {}),
        ...(homologacao && crm ? { crmEmissor: crm } : {}),
        vdf: vdf === 'sim', peritoUsuario: perito.usuario, peritoNome: perito.nome, peritoUid: perito.uid,
        criadoPor: usuario.uid, criadoPorUsuario: usuario.usuario, pdfUrl,
      });
      // Especialidade pela IA: a classificação começou quando o CID foi escolhido; grava ao terminar.
      categorizarPericiaEmSegundoPlano(id, cid.SUBCAT, rotuloCid(cid));
      // Transcrição do atestado (aba Atestados e Laudos da Ficha): em segundo plano, sem atrasar o registro.
      if (pdfUrl && imagemDoc) {
        const [cab, base64] = imagemDoc.split(',');
        const mime = /data:([^;]+)/.exec(cab)?.[1] || 'image/jpeg';
        transcreverAtestadoPM(base64, mime).then(t => gravarTranscricaoPericia(id, t))
          .catch(e => logErroSeguro('Transcrição do atestado da perícia menor falhou', e));
      }
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
      <CascaFormulario
        casca={casca}
        title={titulo}
        icon="personal_injury"
        onClose={() => { if (!salvando) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" className="max-md:hidden" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <AcoesRodape acoes={[{ id: 'salvar', rotulo: edicao ? 'Salvar alterações' : 'Registrar', icone: 'check', onClick: () => submeterFormulario('form-nova-pericia'), loading: salvando, disabled: !!processando }]} />
          </>
        )}
      >
        <form id="form-nova-pericia" onSubmit={registrar} noValidate className="space-y-6">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <Segmented
            papel="tab" idBase="pm" ariaLabel="Tipo de registro" fullWidth value={modo} onChange={escolherModo}
            options={[{ value: 'registrar', label: 'Registrar atestado' }, { value: 'homologar', label: 'Homologar atestado' }]}
          />

          <div role="tabpanel" id="pm-painel" aria-labelledby={`pm-aba-${modo}`} className="space-y-6">
          {homologacao && !edicao && <section className="space-y-2" aria-labelledby="pm-foto">
            <h3 id="pm-foto" className={secao}>Foto do atestado{ehAdmin
              ? <span className="ml-1 text-xs font-normal text-ink-3">(opcional)</span>
              : <><span className="text-wine ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (obrigatório)</span></>}</h3>
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
          </section>}

          <section className="space-y-4" aria-labelledby="pm-militar">
            <h3 id="pm-militar" className={secao}>Dados do militar</h3>
            {edicao ? (
              <div>
                <Field label="Nome">
                  {a => <input {...a} type="text" readOnly disabled value={editar?.inspecionado ?? ''} />}
                </Field>
                {msgAcumulado && <p className="mt-1.5 text-xs font-semibold text-wine" role={passaDe30 ? 'alert' : undefined}>{msgAcumulado}</p>}
              </div>
            ) : (
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
              {/* Histórico recente do inspecionado: logo abaixo do Nome, em vermelho. */}
              {msgAcumulado && (
                <p className="mt-1.5 text-xs font-semibold text-wine" role={passaDe30 ? 'alert' : undefined}>{msgAcumulado}</p>
              )}
            </div>
            )}
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
          </section>

          <section className="space-y-4" aria-labelledby="pm-atestado">
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
              {tempoField('Tempo do atestado', tempoAtestado, setTempoAtestado, erros.tempoAtestado, avisoMaxAtestado && !homologacao, alterarTempoAtestado)}
              {homologacao && tempoField('Tempo homologado', tempoHomologado, setTempoHomologado, erros.tempoHomologado, avisoMaxHomologado, alterarTempoHomologado)}
            </div>
            {homologacao && emissorLido && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-4">
                <Field label="Médico emissor">
                  {a => <input {...a} type="text" value={medicoEmissor} onChange={e => setMedicoEmissor(e.target.value)} />}
                </Field>
                <Field label="CRM">
                  {a => <input {...a} type="text" value={crmEmissor} onChange={e => setCrmEmissor(e.target.value)} />}
                </Field>
              </div>
            )}
            <Autocomplete
              label="CID" required error={erros.cid} placeholder="Digite o código ou a descrição do CID"
              valor={cidTexto} opcoes={opcoesCid}
              onDigitar={t => { setCidTexto(t); setCid(null); limpar('cid'); }}
              onSelecionar={o => { const c = cids.find(x => x.SUBCAT === o.chave); if (c) { setCid(c); setCidTexto(rotuloCid(c)); limpar('cid'); } }}
            />
            <Field label="Dispensas" required error={erros.dispensas}>
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
            </Field>
            <ChoiceGroup
              label="ENC p/ VDF?" required emLinha value={vdf} error={erros.vdf}
              onChange={v => { setVdf(v); limpar('vdf'); }}
              options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
            />
          </section>

          {ehAdmin && (
            <Field label="Perito responsável">
              {a => (
                <select {...a} value={peritoUid} onChange={e => setPeritoUid(e.target.value)}>
                  {opcoesPerito.map(p => <option key={p.uid} value={p.uid}>{rotuloPerito(p)}</option>)}
                </select>
              )}
            </Field>
          )}
          {edicao && usuario?.perfil !== 'admin' && (
            <Field label="Justificativa da alteração" required error={erros.justificativa}
              help={`Mínimo de ${MIN_JUSTIFICATIVA_EXCLUSAO} caracteres. Fica no registro da alteração.`}>
              {a => <textarea {...a} value={justificativa} maxLength={2000} onChange={e => { setJustificativa(e.target.value); limpar('justificativa'); }} className={`${a.className} min-h-[88px]`} />}
            </Field>
          )}
          </div>
        </form>
      </CascaFormulario>

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

const normalizarCidCod = (c?: string) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
