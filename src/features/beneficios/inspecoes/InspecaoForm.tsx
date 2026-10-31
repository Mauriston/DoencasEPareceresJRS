// Ficheiro: components/inspecoes/InspecaoForm.tsx
// "Cadastrar IS": barra lateral à direita (desktop) ou bottom sheet (mobile). Campos: Nº da IS, data de
// abertura, inspecionado (autocomplete na base INSPECIONADOS, com "Cadastrar novo"), finalidade (filtrada
// pelo vínculo do inspecionado), AMP (definido pela finalidade: JRS ou MPI), perito (usuários médicos
// do AMP) e, opcionalmente, já a data/hora da entrevista (slots de 20 min). A IS nasce "Aberta", ou
// "Agendada" quando a entrevista já é marcada no cadastro.
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Autocomplete, type OpcaoAutocomplete } from '@/components/ui/Autocomplete';
import { FinalidadeDropdown, type GrupoFinalidadeExtra } from '@/features/estudo/ExamesGuide';
import { CadastroInspecionado } from '../militares/CadastroInspecionado';
import { SeletorHorario, estadoDoSlot } from './SeletorHorario';
import { carregarFinalidadesIS, filtrarFinalidadesPorVinculo, normalizarBusca, type GrupoFinalidadeIS } from '@/utils/corposQuadros';
import { formatNip } from '@/utils/format';
import { hojeISO, ocupadosDe, duracaoDoGrupo, peritoAtendeNoTurno, turnoDoSlot, type BloqueioAgenda, type ConfigAgenda } from '@/utils/inspecoes';
import { vinculoDoInspecionado, type MilitarRecord } from '@/services/firestoreMilitares';
import { criarInspecao, idDaIs, type AmpIS, type InspecaoRecord } from '@/services/firestoreInspecoes';
import { peritosDoAmp, ampDaFinalidade, type PeritoIS } from '@/services/peritosIS';

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
  /** Pré-preenchimento ao clicar num horário livre do calendário. */
  inicial?: { dataEntrevista?: string; peritoUid?: string };
  onClose: () => void;
  onCriada: (is: InspecaoRecord) => void;
}

type Erros = Record<string, string>;

export const InspecaoForm: React.FC<Props> = ({ militares, peritos, config, bloqueios, inspecoes, usuario, podeCadastrarInspecionado, podeAgendar, inicial, onClose, onCriada }) => {
  const [numero, setNumero] = useState('');
  const [dataAbertura, setDataAbertura] = useState(hojeISO());
  const [militar, setMilitar] = useState<MilitarRecord | null>(null);
  const [militarTexto, setMilitarTexto] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [recemCadastradoId, setRecemCadastradoId] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [verTodas, setVerTodas] = useState(false);
  const [grupos, setGrupos] = useState<GrupoFinalidadeIS[]>([]);
  const [amp, setAmp] = useState<AmpIS | ''>('');
  const [peritoUid, setPeritoUid] = useState(inicial?.peritoUid ?? '');
  const [data, setData] = useState(inicial?.dataEntrevista?.slice(0, 10) ?? '');
  const [hora, setHora] = useState(inicial?.dataEntrevista?.slice(11, 16) ?? '');
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarFinalidadesIS().then(setGrupos).catch(() => setGrupos([])); }, []);
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

  const vinculoFiltro = militar && !verTodas ? vinculoDoInspecionado(militar) : '';
  const gruposFinalidade: GrupoFinalidadeExtra[] = useMemo(
    () => filtrarFinalidadesPorVinculo(grupos, vinculoFiltro).map(g => ({ nome: g.grupo, finalidades: g.finalidades.map(f => f.nome) })),
    [grupos, vinculoFiltro],
  );
  const achada = useMemo(() => {
    for (const g of grupos) { const f = g.finalidades.find(x => x.nome === finalidade); if (f) return { grupo: g.grupo, ...f }; }
    return null;
  }, [grupos, finalidade]);
  const ampCompetente: AmpIS | '' = achada ? ampDaFinalidade(achada.amp) : '';

  // Trocou o inspecionado e a finalidade deixou de valer para o vínculo: limpa.
  useEffect(() => {
    if (!finalidade || grupos.length === 0 || !vinculoFiltro) return;
    if (!filtrarFinalidadesPorVinculo(grupos, vinculoFiltro).some(g => g.finalidades.some(f => f.nome === finalidade))) setFinalidade('');
  }, [vinculoFiltro, grupos]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const perito = peritos.find(p => p.uid === peritoUid);
  const ocupados = useMemo(() => ocupadosDe(inspecoes), [inspecoes]);
  // Entrevista de 20 min (padrão), 30 (Verificações e Términos) ou 60 (Benefícios), conforme a finalidade.
  const duracao = duracaoDoGrupo(achada?.grupo);

  const validar = (): Erros => {
    const e: Erros = {};
    if (!idDaIs(numero)) e.numero = 'Informe o número da IS (somente dígitos).';
    else if (inspecoes.some(i => i.id === idDaIs(numero))) e.numero = `Já existe a IS nº ${idDaIs(numero)}.`;
    if (!dataAbertura) e.dataAbertura = 'Informe a data de abertura.';
    if (!militar) e.militar = 'Escolha o inspecionado na lista.';
    if (!finalidade) e.finalidade = 'Selecione a finalidade.';
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
      const id = await criarInspecao({
        is: Number(idDaIs(numero)), dataAbertura, dataEntrevista,
        finalidade, grupoFinalidade: achada.grupo, amp,
        peritoUid: perito?.uid ?? '', peritoNome: perito?.usuario ?? '', peritoGmail: perito?.gmail ?? '',
        inspecionadoId: militar.id, inspecionado: militar.inspecionado,
        dataLaudo: '', laudo: '', observacoes: observacoes.trim(), restricoes: '', tis: '', ds1a: '',
        criadoPor: usuario.usuario,
      });
      onCriada({
        id, is: Number(id), dataAbertura, dataEntrevista, finalidade, grupoFinalidade: achada.grupo, amp,
        peritoUid: perito?.uid ?? '', peritoNome: perito?.usuario ?? '', peritoGmail: perito?.gmail ?? '',
        inspecionadoId: militar.id, inspecionado: militar.inspecionado,
        situacao: dataEntrevista ? 'andamento' : 'aberta', status: dataEntrevista ? 'agendada' : 'aberta',
        dataLaudo: '', laudo: '', observacoes: observacoes.trim(), restricoes: '', tis: '', ds1a: '', criadoPor: usuario.usuario, criadoEm: null,
      });
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
            <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button type="submit" form="form-nova-is" icon="save" loading={salvando}>Cadastrar IS</Button>
          </>
        )}
      >
        <form id="form-nova-is" onSubmit={salvar} noValidate className="space-y-4">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nº da IS" required error={erros.numero}>
              {a => <input {...a} type="text" inputMode="numeric" value={numero} onChange={e => { setNumero(e.target.value.replace(/\D/g, '')); limpar('numero'); }} className={`${a.className} font-mono`} autoComplete="off" />}
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

          <div>
            <label className="block text-xs font-semibold text-ink-3 mb-1">Finalidade<span className="text-wine ml-0.5" aria-hidden="true">*</span></label>
            <FinalidadeDropdown value={finalidade} onChange={v => { setFinalidade(v); limpar('finalidade'); }} placeholder="Selecione a finalidade da IS" gruposProprios={gruposFinalidade} erro={!!erros.finalidade} />
            {militar && (
              <p className="mt-1 text-xs text-ink-3">
                {verTodas ? 'Mostrando todas as finalidades.' : `Finalidades disponíveis para o vínculo ${vinculoDoInspecionado(militar)}.`}{' '}
                <button type="button" onClick={() => setVerTodas(v => !v)} className="font-semibold text-navy underline min-h-[24px]">{verTodas ? 'Filtrar pelo vínculo' : 'Ver todas'}</button>
              </p>
            )}
            {erros.finalidade && <p role="alert" className="mt-1 text-xs font-semibold text-wine">{erros.finalidade}</p>}
          </div>

          <ChoiceGroup<AmpIS>
            label="AMP de competência" value={amp} onChange={() => { /* definido pela finalidade */ }}
            options={[{ value: 'JRS', label: 'JRS' }, { value: 'MPI', label: 'MPI' }]}
          />
          <p className="-mt-3 text-xs text-ink-3">{ampCompetente ? `Definido pela finalidade: competência da ${ampCompetente}.` : 'Definido automaticamente pela finalidade escolhida.'}</p>

          {ampCompetente && (
            <div>
              {peritosDoAmpAtual.length === 0
                ? <p role="alert" className="text-sm font-semibold text-wine">Não há perito ativo para o AMP {ampCompetente}. Cadastre o usuário médico em Usuários.</p>
                : (
                  <ChoiceGroup<string>
                    label={`Perito (${ampCompetente === 'JRS' ? 'Admin e médicos JRS' : 'médicos MPI'})`} error={erros.perito}
                    value={peritoUid} onChange={v => { setPeritoUid(v); setHora(''); limpar('perito'); }}
                    options={peritosDoAmpAtual.map(p => ({ value: p.uid, label: p.usuario, avatar: { nome: p.usuario, imageProfile: p.imageProfile } }))}
                  />
                )}
            </div>
          )}

          {podeAgendar && ampCompetente && (
            <fieldset className="border border-line rounded-xl p-3 space-y-3">
              <legend className="px-1 text-xs font-bold text-ink-3">Entrevista (opcional — pode ser agendada depois)</legend>
              <SeletorHorario
                duracao={duracao} peritoUid={peritoUid} data={data} onData={d => { setData(d); limpar('hora'); }} hora={hora} onHora={h => { setHora(h); limpar('hora'); }}
                config={config} bloqueios={bloqueios} ocupados={ocupados} erro={erros.hora} permitirDataPassada={podeDataPassada}
              />
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
