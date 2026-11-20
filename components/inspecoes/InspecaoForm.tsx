// Ficheiro: components/inspecoes/InspecaoForm.tsx
// "Cadastrar IS": barra lateral à direita (desktop) ou bottom sheet (mobile). Campos: Nº da IS, data de
// abertura, inspecionado (autocomplete na base INSPECIONADOS, com "Cadastrar novo"), finalidade (todas,
// no menu em cascata por grupo), AMP (definido pela finalidade: JRS ou MPI), perito (cards com avatar dos
// usuários médicos do AMP — AvatarRadioGroup, com "JRS"/"MPI" na 2ª linha) e, opcionalmente, já a data/hora da entrevista. A IS nasce "Aberta", ou
// "Agendada" quando a entrevista já é marcada no cadastro.
// Data da entrevista (quem pode agendar): calendário do mês (CalendarioDisponibilidade) em que só os dias com
// horário livre de algum perito do AMP ficam habilitados, cada um com o nº de IS já agendadas no dia (do AMP).
// Escolhida a data, aparecem os peritos com horário naquele dia; escolhido o perito, os slots (SeletorHorario).
// Sem permissão de agendar: só o perito (cards), como antes.
// Finalidade com exames mínimos (guias de exames — utils/guiasExamesIS.ts): se o cadastro do inspecionado não
// tem data de nascimento e/ou sexo, o formulário pede (obrigatórios; o sexo vem sugerido pela IA a partir do
// primeiro nome, para o usuário confirmar) e grava no cadastro (militares/{id}). As guias são geradas depois
// de criada a IS (components/inspecoes/guias/PosCriacaoIS).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { AcoesRodape, submeterFormulario } from '../ui/AcoesRodape';
import { Field } from '../ui/Field';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { AvatarRadioGroup, type AvatarRadioOption } from '../ui/AvatarRadioGroup';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { FinalidadeDropdown, type GrupoFinalidadeExtra } from '../ExamesGuide';
import { CadastroInspecionado } from '../militares/CadastroInspecionado';
import { SeletorHorario, estadoDoSlot, slotsLivresDoDia } from './SeletorHorario';
import { CalendarioDisponibilidade } from './CalendarioDisponibilidade';
import { carregarFinalidadesIS, normalizarBusca, type GrupoFinalidadeIS } from '../../utils/corposQuadros';
import { formatNip } from '../../utils/format';
import { hojeISO, ocupadosDe, duracaoDoGrupo, peritoAtendeNoTurno, turnoDoSlot, somarDias, dataBr, nomeDiaSemana, type BloqueioAgenda, type ConfigAgenda } from '../../utils/inspecoes';
import { contarISPorDia } from '../../utils/agendaIS';
import { atualizarMilitar, OPCOES_SEXO, type MilitarRecord, type SexoInspecionado } from '../../services/firestoreMilitares';
import { casarFinalidadeAnexoO, erroDataNascimento } from '../../utils/guiasExamesIS';
import { finalidadeTemExamesMinimos } from '../../utils/guiasExames';
import { sugerirSexoPeloNome } from '../../services/guiasExamesIA';
import { criarInspecao, idDaIs, type AmpIS, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { peritosDoAmp, ampDaFinalidade, perfilAtendeAmp, type PeritoIS } from '../../services/peritosIS';

/** Card do perito (AvatarRadioGroup): login em destaque e, na 2ª linha, o AMP do perfil (user_medicos_mpi → MPI; Admin e user_medicos → JRS). */
export const opcaoAvatarDoPerito = (p: PeritoIS): AvatarRadioOption<string> => ({
  value: p.uid, label: p.usuario, imageProfile: p.imageProfile, nomeAvatar: p.nome || p.usuario,
  secundaria: perfilAtendeAmp(p.perfil, 'MPI') ? 'MPI' : 'JRS',
});

/** Finalidade escolhida no menu: nome, grupo e AMP de competência. */
export interface FinalidadeEscolhida { finalidade: string; grupo: string; amp: AmpIS }

/** Finalidades de IS por grupo (public/finalidadesIS.json) para o menu em cascata, e a busca do grupo/AMP de uma finalidade. */
export const useFinalidadesIS = (ativo = true) => {
  const [grupos, setGrupos] = useState<GrupoFinalidadeIS[]>([]);
  useEffect(() => { if (ativo) carregarFinalidadesIS().then(setGrupos).catch(() => setGrupos([])); }, [ativo]);
  // Todas as finalidades, por grupo (sem filtrar pelo vínculo/título do inspecionado).
  const gruposMenu: GrupoFinalidadeExtra[] = useMemo(
    () => grupos.map(g => ({ nome: g.grupo, finalidades: g.finalidades.map(f => f.nome) })),
    [grupos],
  );
  const achar = (nome: string): FinalidadeEscolhida | null => {
    for (const g of grupos) { const f = g.finalidades.find(x => x.nome === nome); if (f) return { finalidade: f.nome, grupo: g.grupo, amp: ampDaFinalidade(f.amp) }; }
    return null;
  };
  return { gruposMenu, achar };
};

/** Campo "Finalidade" (menu em cascata por grupo) — o mesmo no cadastro e no detalhe da IS aberta. */
export const CampoFinalidadeIS: React.FC<{ value: string; onChange: (nome: string) => void; gruposMenu: GrupoFinalidadeExtra[]; required?: boolean; erro?: string }> = ({ value, onChange, gruposMenu, required, erro }) => (
  <div>
    <label htmlFor="finalidade-select" className="block text-xs font-semibold text-ink-3 mb-1">Finalidade{required && <span className="text-wine ml-0.5" aria-hidden="true">*</span>}</label>
    <FinalidadeDropdown value={value} onChange={onChange} placeholder="Selecione a finalidade da IS" gruposProprios={gruposMenu} erro={!!erro} />
    {erro && <p role="alert" className="mt-1 text-xs font-semibold text-wine">{erro}</p>}
  </div>
);

interface Props {
  militares: MilitarRecord[];
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  usuario: { uid: string; usuario: string; perfil: string };
  /** Quem cadastra inspecionado "na hora" (permissão militares.cadastrar). */
  podeCadastrarInspecionado: boolean;
  /** Quem agenda a entrevista já no cadastro (permissão inspecoes.agendar). */
  podeAgendar: boolean;
  /** Pré-preenchimento ao clicar num horário livre do calendário, ou o inspecionado (id = NIP) vindo da Ficha. */
  inicial?: { dataEntrevista?: string; peritoUid?: string; inspecionadoId?: string };
  onClose: () => void;
  /** `dados`: o que o formulário completou do cadastro (data de nascimento e sexo), para as guias de exames. */
  onCriada: (is: InspecaoRecord, dados: DadosInspecionadoIS) => void;
}

/** Sexo e data de nascimento do inspecionado no momento da abertura (cadastro + o que o formulário pediu). */
export interface DadosInspecionadoIS { sexo?: SexoInspecionado; dataNascimento?: string }

type Erros = Record<string, string>;

export const InspecaoForm: React.FC<Props> = ({ militares, peritos, config, bloqueios, inspecoes, usuario, podeCadastrarInspecionado, podeAgendar, inicial, onClose, onCriada }) => {
  const [numero, setNumero] = useState('');
  const [dataAbertura, setDataAbertura] = useState(hojeISO());
  const [militar, setMilitar] = useState<MilitarRecord | null>(null);
  const [militarTexto, setMilitarTexto] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  // Também o inspecionado pré-escolhido (Ficha → Abrir IS): é selecionado assim que a lista o tiver.
  const [recemCadastradoId, setRecemCadastradoId] = useState(inicial?.inspecionadoId ?? '');
  const [finalidade, setFinalidade] = useState('');
  const [amp, setAmp] = useState<AmpIS | ''>('');
  const [peritoUid, setPeritoUid] = useState(inicial?.peritoUid ?? '');
  const [data, setData] = useState(inicial?.dataEntrevista?.slice(0, 10) ?? '');
  const [hora, setHora] = useState(inicial?.dataEntrevista?.slice(11, 16) ?? '');
  const [observacoes, setObservacoes] = useState('');
  // Guias de exames: data de nascimento e sexo que faltam no cadastro.
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState<SexoInspecionado | ''>('');
  const [sexoSugerido, setSexoSugerido] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  const { gruposMenu, achar } = useFinalidadesIS();
  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));

  // Inspecionado recém-cadastrado: assim que aparece na lista, já vem selecionado.
  useEffect(() => {
    if (!recemCadastradoId) return;
    const m = militares.find(x => x.id === recemCadastradoId);
    if (m) { setMilitar(m); setMilitarTexto(m.inspecionado); setRecemCadastradoId(''); limpar('militar'); }
  }, [recemCadastradoId, militares]);

  const opcoesMilitar: OpcaoAutocomplete[] = useMemo(() => militares.map(m => ({
    chave: m.id, principal: m.nome, secundaria: `${m.pgq} · ${formatNip(m.nip)}${m.om ? ` · ${m.om}` : ''}`,
    busca: normalizarBusca(`${m.inspecionado} ${m.om} ${m.id}`),
  })), [militares]);

  const achada = useMemo(() => achar(finalidade), [gruposMenu, finalidade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Finalidade com exames mínimos: pede o que falta no cadastro para as guias.
  const temExamesMinimos = useMemo(() => { const f = casarFinalidadeAnexoO(finalidade); return !!f && finalidadeTemExamesMinimos(f); }, [finalidade]);
  const pedirNascimento = temExamesMinimos && !!militar && !militar.dataNascimento;
  const pedirSexo = temExamesMinimos && !!militar && !militar.sexo;
  // Outro inspecionado: limpa o que foi digitado para o anterior.
  useEffect(() => { setDataNascimento(''); setSexo(''); setSexoSugerido(false); }, [militar?.id]);
  // Sem sexo no cadastro: a IA sugere pelo primeiro nome (uma vez por inspecionado); o usuário confirma.
  const sugeridoPara = useRef('');
  const sexoRef = useRef(sexo);
  sexoRef.current = sexo;
  useEffect(() => {
    if (!pedirSexo || !militar || sugeridoPara.current === militar.id) return;
    sugeridoPara.current = militar.id;
    const id = militar.id;
    sugerirSexoPeloNome(militar.nome).then(s => {
      if (s && sugeridoPara.current === id && !sexoRef.current) { setSexo(s); setSexoSugerido(true); }
    });
  }, [pedirSexo, militar]);
  const ampCompetente: AmpIS | '' = achada ? achada.amp : '';

  // O AMP é o da competência da finalidade; trocar de finalidade pode invalidar o perito.
  const peritosDoAmpAtual = useMemo(() => (ampCompetente ? peritosDoAmp(peritos, ampCompetente) : []), [peritos, ampCompetente]);
  useEffect(() => {
    setAmp(ampCompetente);
    if (!ampCompetente) { setPeritoUid(''); return; }
    setPeritoUid(atual => {
      if (atual && peritosDoAmpAtual.some(p => p.uid === atual)) return atual;
      // Perfil médico cadastrando: já vem como o perito, quando atende o AMP.
      return peritosDoAmpAtual.find(p => p.uid === usuario.uid)?.uid ?? '';
    });
  }, [ampCompetente, peritosDoAmpAtual]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entrevista em data passada (registro retroativo) só para o Admin.
  const podeDataPassada = usuario.perfil === 'admin';
  const peritoEscolhido = peritos.find(p => p.uid === peritoUid);
  const perito = peritoEscolhido;
  const ocupados = useMemo(() => ocupadosDe(inspecoes), [inspecoes]);
  // Entrevista de 20 min (padrão), 30 (Verificações e Términos) ou 60 (Benefícios), conforme a finalidade.
  const duracao = duracaoDoGrupo(achada?.grupo);

  // Data da entrevista: dias com horário livre de algum perito do AMP; nº de IS já agendadas no dia (do AMP).
  const porDia = useMemo(() => contarISPorDia(inspecoes, { amp: ampCompetente || undefined }), [inspecoes, ampCompetente]);
  const peritosLivresNoDia = (d: string) => peritosDoAmpAtual.filter(p => slotsLivresDoDia(p.uid, d, config, bloqueios, ocupados, duracao).length > 0);
  const diaDisponivel = (d: string) => peritosLivresNoDia(d).length > 0;
  const peritosDoDia = useMemo(() => (data ? peritosLivresNoDia(data) : []), [data, peritosDoAmpAtual, config, bloqueios, ocupados, duracao]); // eslint-disable-line react-hooks/exhaustive-deps
  const proximaLivre = useMemo(() => {
    if (!podeAgendar || !ampCompetente) return '';
    const hoje = hojeISO();
    for (let i = 0; i < 180; i++) { const d = somarDias(hoje, i); if (diaDisponivel(d)) return d; }
    return '';
  }, [podeAgendar, ampCompetente, peritosDoAmpAtual, config, bloqueios, ocupados, duracao]); // eslint-disable-line react-hooks/exhaustive-deps
  const escolherData = (d: string) => {
    setData(d); setHora(''); limpar('hora'); limpar('perito');
    const livres = peritosLivresNoDia(d);
    // Fica o perito já escolhido (ou o próprio médico) se tiver horário no dia; um só já vem selecionado.
    setPeritoUid(atual => livres.some(p => p.uid === atual) ? atual
      : livres.some(p => p.uid === usuario.uid) ? usuario.uid
      : livres.length === 1 ? livres[0].uid : '');
  };
  const limparData = () => { setData(''); setHora(''); limpar('hora'); limpar('perito'); };

  const validar = (): Erros => {
    const e: Erros = {};
    if (!idDaIs(numero)) e.numero = 'Informe o número da IS (somente dígitos).';
    else if (inspecoes.some(i => i.id === idDaIs(numero))) e.numero = `Já existe a IS nº ${idDaIs(numero)}.`;
    if (!dataAbertura) e.dataAbertura = 'Informe a data de abertura.';
    if (!militar) e.militar = 'Escolha o inspecionado na lista.';
    if (!finalidade) e.finalidade = 'Selecione a finalidade.';
    if (pedirNascimento) { const erro = erroDataNascimento(dataNascimento, hojeISO()); if (erro) e.dataNascimento = erro; }
    if (pedirSexo && !sexo) e.sexo = 'Informe o sexo.';
    if ((data || hora) && !perito) e.perito = 'Escolha o perito para agendar a entrevista.';
    if (data && !hora) e.hora = 'Escolha o horário da entrevista.';
    if (hora && !data) e.hora = 'Escolha a data da entrevista.';
    if (data && data < hojeISO() && !podeDataPassada) e.hora = 'Só o Admin pode cadastrar IS com entrevista em data anterior a hoje.';
    if (perito && data && hora) {
      const t = turnoDoSlot(hora);
      const estado = estadoDoSlot(perito.uid, data, hora, !!t && peritoAtendeNoTurno(config, perito.uid, data, t), bloqueios, ocupados, duracao);
      if (estado !== 'livre') e.hora = estado === 'ocupado' ? `${perito.usuario} já tem IS neste horário.` : estado === 'bloqueado' ? 'Esse horário está bloqueado.' : estado === 'nao_cabe' ? `A entrevista (${duracao} min) não cabe no turno a partir deste horário.` : `${perito.usuario} não atende neste turno; escolha outro perito ou horário.`;
    }
    return e;
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#form-nova-is [aria-invalid="true"]')?.focus());
      return;
    }
    if (!militar || !achada || !amp) return;
    setSalvando(true);
    try {
      const dataEntrevista = podeAgendar && data && hora ? `${data}T${hora}` : '';
      // Quem agenda escolhe o perito junto com a data (só os que têm horário no dia); sem data, a IS fica sem perito.
      const perito = !podeAgendar || dataEntrevista ? peritoEscolhido : undefined;
      const id = await criarInspecao({
        is: Number(idDaIs(numero)), dataAbertura, dataEntrevista,
        finalidade, grupoFinalidade: achada.grupo, amp,
        peritoUid: perito?.uid ?? '', peritoNome: perito?.usuario ?? '', peritoGmail: perito?.gmail ?? '',
        inspecionadoId: militar.id, inspecionado: militar.inspecionado,
        dataLaudo: '', laudo: '', observacoes: observacoes.trim(), restricoes: '', tis: '', ds1a: '',
        criadoPor: usuario.usuario,
      });
      // Completa o cadastro (best effort: a IS já está criada; as guias usam os dados de qualquer forma).
      const completar = { ...(pedirNascimento ? { dataNascimento } : {}), ...(pedirSexo && sexo ? { sexo } : {}) };
      if (Object.keys(completar).length) await atualizarMilitar(militar.id, completar).catch(() => { /* sem permissão ou offline */ });
      const dadosInspecionado: DadosInspecionadoIS = {
        sexo: (pedirSexo && sexo) || militar.sexo || undefined,
        dataNascimento: (pedirNascimento && dataNascimento) || militar.dataNascimento || undefined,
      };
      onCriada({
        id, is: Number(id), dataAbertura, dataEntrevista, finalidade, grupoFinalidade: achada.grupo, amp,
        peritoUid: perito?.uid ?? '', peritoNome: perito?.usuario ?? '', peritoGmail: perito?.gmail ?? '',
        inspecionadoId: militar.id, inspecionado: militar.inspecionado,
        situacao: dataEntrevista ? 'andamento' : 'aberta', status: dataEntrevista ? 'agendada' : 'aberta',
        dataLaudo: '', laudo: '', observacoes: observacoes.trim(), restricoes: '', tis: '', ds1a: '', criadoPor: usuario.usuario, criadoEm: null,
      }, dadosInspecionado);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível cadastrar a IS.' });
      setSalvando(false);
    }
  };

  return (
    <>
      <Drawer
        title="Cadastrar IS"
        icon="event_available"
        onClose={() => { if (!salvando) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" className="max-md:hidden" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <AcoesRodape acoes={[{ id: 'salvar', rotulo: 'Cadastrar IS', icone: 'save', onClick: () => submeterFormulario('form-nova-is'), loading: salvando }]} />
          </>
        )}
      >
        <form id="form-nova-is" onSubmit={salvar} noValidate className="space-y-4">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nº da IS" required error={erros.numero}>
              {a => <input {...a} type="text" inputMode="numeric" value={numero} onChange={e => { setNumero(e.target.value.replace(/\D/g, '')); limpar('numero'); }} className={`${a.className} tabular-nums`} autoComplete="off" />}
            </Field>
            <Field label="Data de abertura" required error={erros.dataAbertura}>
              {a => <input {...a} type="date" max={hojeISO()} value={dataAbertura} onChange={e => { setDataAbertura(e.target.value); limpar('dataAbertura'); }} />}
            </Field>
          </div>

          <Autocomplete
            label="Inspecionado" required error={erros.militar}
            placeholder="Digite o nome, o NIP ou a OM"
            valor={militarTexto} opcoes={opcoesMilitar}
            onDigitar={t => { setMilitarTexto(t); setMilitar(null); limpar('militar'); }}
            onSelecionar={o => { const m = militares.find(x => x.id === o.chave); if (m) { setMilitar(m); setMilitarTexto(m.inspecionado); limpar('militar'); } }}
            aoNaoEncontrar={podeCadastrarInspecionado ? { rotulo: 'Cadastrar novo', onClick: () => setCadastrando(true) } : undefined}
          />

          <CampoFinalidadeIS required value={finalidade} onChange={v => { setFinalidade(v); limpar('finalidade'); }} gruposMenu={gruposMenu} erro={erros.finalidade} />

          {(pedirNascimento || pedirSexo) && (
            <fieldset className="border border-line rounded-xl p-3 space-y-3 animate-fade-in">
              <legend className="px-1 text-xs font-bold text-ink-3">Para as guias de exames</legend>
              <p className="text-xs text-ink-3">Faltam no cadastro do inspecionado. Serão salvos no cadastro.</p>
              {pedirNascimento && (
                <Field label="Data de nascimento" required error={erros.dataNascimento}>
                  {a => <input {...a} type="date" max={hojeISO()} value={dataNascimento} onChange={e => { setDataNascimento(e.target.value); limpar('dataNascimento'); }} />}
                </Field>
              )}
              {pedirSexo && (
                <div>
                  <ChoiceGroup<SexoInspecionado>
                    label="Sexo" required emLinha options={OPCOES_SEXO} value={sexo} error={erros.sexo}
                    onChange={v => { setSexo(v); setSexoSugerido(false); limpar('sexo'); }}
                  />
                  {sexoSugerido && <p className="mt-1 text-xs text-ink-3">Sugerido pela IA a partir do nome. Confira.</p>}
                </div>
              )}
            </fieldset>
          )}

          <ChoiceGroup<AmpIS>
            label="AMP de competência" value={amp} onChange={() => { /* definido pela finalidade */ }}
            options={[{ value: 'JRS', label: 'JRS' }, { value: 'MPI', label: 'MPI' }]}
          />
          <p className="-mt-3 text-xs text-ink-3">{ampCompetente ? `Definido pela finalidade: competência da ${ampCompetente}.` : 'Definido automaticamente pela finalidade escolhida.'}</p>

          {ampCompetente && peritosDoAmpAtual.length === 0 && (
            <p role="alert" className="text-sm font-semibold text-wine">Não há perito ativo para o AMP {ampCompetente}. Cadastre o usuário médico em Usuários.</p>
          )}

          {ampCompetente && !podeAgendar && peritosDoAmpAtual.length > 0 && (
            <AvatarRadioGroup<string>
              label={`Perito (${ampCompetente === 'JRS' ? 'Admin e médicos JRS' : 'médicos MPI'})`} error={erros.perito}
              value={peritoUid} onChange={v => { if (v !== peritoUid) { setPeritoUid(v); setHora(''); } limpar('perito'); }}
              options={peritosDoAmpAtual.map(opcaoAvatarDoPerito)}
            />
          )}

          {podeAgendar && ampCompetente && peritosDoAmpAtual.length > 0 && (
            <fieldset className="border border-line rounded-xl p-3 space-y-3 animate-fade-in">
              <legend className="px-1 text-xs font-bold text-ink-3">Data Entrevista (opcional — pode ser agendada depois)</legend>
              <CalendarioDisponibilidade
                key={`${ampCompetente}-${duracao}`}
                valor={data} onChange={escolherData} disponivel={diaDisponivel}
                contagem={d => porDia.get(d) ?? 0} mesInicial={data || hojeISO()} permitirPassado={podeDataPassada}
              />
              {!data && (proximaLivre
                ? <p className="text-xs text-ink-3">Próxima data livre ({ampCompetente}): <button type="button" onClick={() => escolherData(proximaLivre)} className="font-bold text-navy underline min-h-[24px]">{nomeDiaSemana(proximaLivre)}, {dataBr(proximaLivre)}</button></p>
                : <p role="status" className="text-xs font-semibold text-wine">Nenhuma data livre nos próximos meses para o AMP {ampCompetente}. O Admin define os turnos dos peritos em "Turnos dos peritos".</p>)}

              {data && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-navy first-letter:uppercase">{nomeDiaSemana(data)}, {dataBr(data)}</p>
                  <Button variant="ghost" size="sm" icon="close" onClick={limparData}>Limpar data</Button>
                </div>
              )}
              {data && peritosDoDia.length === 0 && (
                <p role="alert" className="text-sm font-semibold text-wine">Nenhum perito {ampCompetente === 'JRS' ? 'da JRS' : 'do MPI'} tem horário livre em {dataBr(data)}. Escolha outra data.</p>
              )}
              {data && peritosDoDia.length > 0 && (
                <AvatarRadioGroup<string>
                  label={`Perito com horário em ${dataBr(data)}`} error={erros.perito}
                  value={peritoUid} onChange={v => { if (v !== peritoUid) { setPeritoUid(v); setHora(''); } limpar('perito'); limpar('hora'); }}
                  options={peritosDoDia.map(opcaoAvatarDoPerito)}
                />
              )}
              {data && peritoUid && peritosDoDia.some(p => p.uid === peritoUid) && (
                <SeletorHorario
                  semCampoData duracao={duracao} peritoUid={peritoUid} data={data} onData={d => { setData(d); limpar('hora'); }} hora={hora} onHora={h => { setHora(h); limpar('hora'); }}
                  config={config} bloqueios={bloqueios} ocupados={ocupados} erro={erros.hora}
                />
              )}
              {erros.hora && !(data && peritoUid) && <p role="alert" className="text-xs font-semibold text-wine">{erros.hora}</p>}
              {hora && data && <p className="text-xs font-semibold text-green-700">A IS será cadastrada já como Agendada.</p>}
            </fieldset>
          )}

          <Field label="Observações">
            {a => <textarea {...a} value={observacoes} onChange={e => setObservacoes(e.target.value)} className={`${a.className} min-h-[72px]`} />}
          </Field>
        </form>
      </Drawer>

      {cadastrando && (
        <CadastroInspecionado
          onClose={() => setCadastrando(false)}
          onCriado={(_nome, id) => { setCadastrando(false); setRecemCadastradoId(id); }}
        />
      )}
    </>
  );
};
