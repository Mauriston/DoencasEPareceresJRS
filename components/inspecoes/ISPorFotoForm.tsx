// Ficheiro: components/inspecoes/ISPorFotoForm.tsx
// "IS por foto" (página Inspeções de Saúde, botão da câmera ao lado de "Abrir IS"): cria ou atualiza a IS a
// partir de prints do SINAIS lidos pela IA (Firebase AI Logic, services/sinaisIA.ts).
//  1. Fotos: a tela da IS (obrigatória) e, opcionalmente, a da conclusão (laudos e restrições).
//     Enviar, fotografar ou colar (Ctrl+V).
//  2. Inspecionado pelo NIP: achado na base, ou cadastrado agora com a mesma foto — direto quando o
//     print traz tudo, ou no cadastro já preenchido para completar (MilitarCadastroForm).
//  3. Conferir: finalidade, datas, perito/horário e, com a foto da conclusão, Laudo, Restrições, Nº do TIS e
//     DS-1a. O status sai das regras de utils/importacaoIS.ts e aparece no topo.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { AcoesRodape, submeterFormulario } from '../ui/AcoesRodape';
import { Field } from '../ui/Field';
import { StatusTag } from '../ui/StatusTag';
import { AvatarRadioGroup } from '../ui/AvatarRadioGroup';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { MilitarCadastroForm } from '../militares/MilitarCadastroForm';
import { SeletorHorario, estadoDoSlot } from './SeletorHorario';
import { CampoFinalidadeIS, opcaoAvatarDoPerito, useFinalidadesIS } from './InspecaoForm';
import { arquivoParaBase64IA } from '../../services/geminiAI';
import { lerConclusaoDoSinais, lerISDoSinais } from '../../services/sinaisIA';
import { criarMilitar, type MilitarRecord } from '../../services/firestoreMilitares';
import { importarInspecao, type AmpIS, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import { carregarCorposQuadros, carregarFinalidadesIS, carregarOms, carregarRestricoesIS } from '../../utils/corposQuadros';
import { preencherInspecionadoDoSinais, militarDoPreenchimento } from '../../utils/inspecionadoSinais';
import { proporImportacao, statusDaConclusao, statusDosDados, type PropostaImportacao } from '../../utils/importacaoIS';
import { mostraRestricoes, opcoesDeRestricoes, separarRestricoes, juntarRestricoes } from '../../utils/conclusaoIS';
import {
  hojeISO, ocupadosDe, duracaoDoGrupo, peritoAtendeNoTurno, turnoDoSlot, STATUS_IS,
  type BloqueioAgenda, type ConfigAgenda, type StatusIS,
} from '../../utils/inspecoes';

interface Props {
  militares: MilitarRecord[];
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  usuario: { uid: string; usuario: string; perfil: string };
  /** Quem pode cadastrar o inspecionado que não está na base (permissão militares.cadastrar). */
  podeCadastrarInspecionado: boolean;
  onClose: () => void;
  onSalva: (is: InspecaoRecord, criada: boolean, agendaReservada: boolean) => void;
}

type Erros = Record<string, string>;

/** Status em que a entrevista ainda vai acontecer: só aí o horário é reservado (e precisa estar livre). */
const STATUS_DE_AGENDA: StatusIS[] = ['agendada', 'reagendada'];

const CampoFoto: React.FC<{ rotulo: string; arquivo: File | null; onArquivo: (f: File | null) => void; disabled?: boolean }> = ({ rotulo, arquivo, onArquivo, disabled }) => {
  const input = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : ''), [arquivo]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div className="min-w-0">
      <span className="block text-xs font-semibold text-ink-3 mb-1">{rotulo}</span>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArquivo(f); }} />
      {arquivo ? (
        <div className="relative rounded-lg border border-line bg-thead/60 overflow-hidden">
          <img src={url} alt={rotulo} className="w-full h-40 object-contain bg-white" />
          {!disabled && (
            <button
              type="button" onClick={() => onArquivo(null)} aria-label={`Remover ${rotulo.toLowerCase()}`}
              className="absolute top-1 right-1 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full bg-navy/80 text-white hover:bg-wine"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button" disabled={disabled} onClick={() => input.current?.click()}
          className="w-full h-40 rounded-lg border-2 border-dashed border-line bg-thead/60 hover:bg-thead flex flex-col items-center justify-center gap-1 text-ink-3 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[28px]" aria-hidden="true">add_a_photo</span>
          <span className="text-xs font-semibold">Enviar ou fotografar</span>
        </button>
      )}
    </div>
  );
};

export const ISPorFotoForm: React.FC<Props> = ({ militares, peritos, config, bloqueios, inspecoes, usuario, podeCadastrarInspecionado, onClose, onSalva }) => {
  const [foto1, setFoto1] = useState<File | null>(null);
  const [foto2, setFoto2] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erroLeitura, setErroLeitura] = useState('');

  const [proposta, setProposta] = useState<PropostaImportacao | null>(null);
  const [militarId, setMilitarId] = useState('');
  const [militarNovo, setMilitarNovo] = useState(false);
  const [cadastrandoComPrint, setCadastrandoComPrint] = useState(false);
  const [opcoesRestricoes, setOpcoesRestricoes] = useState<string[]>([]);

  // Campos conferidos pelo usuário.
  const [finalidade, setFinalidade] = useState('');
  const [dataAbertura, setDataAbertura] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [peritoUid, setPeritoUid] = useState('');
  const [laudo, setLaudo] = useState('');
  const [dataLaudo, setDataLaudo] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [tis, setTis] = useState('');
  const [ds1a, setDs1a] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  const { gruposMenu, achar } = useFinalidadesIS();
  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));

  // Ctrl+V com imagem: preenche a primeira foto vazia (enquanto o cadastro do inspecionado não está aberto).
  useEffect(() => {
    if (proposta || cadastrandoComPrint) return;
    const aoColar = (e: ClipboardEvent) => {
      const img = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))?.getAsFile();
      if (!img) return;
      e.preventDefault();
      if (!foto1) setFoto1(img); else setFoto2(img);
    };
    window.addEventListener('paste', aoColar);
    return () => window.removeEventListener('paste', aoColar);
  }, [foto1, proposta, cadastrandoComPrint]);

  const militar = militares.find(m => m.id === militarId) ?? null;
  const atual = proposta ? inspecoes.find(i => i.id === proposta.numero) ?? null : null;

  const achada = useMemo(() => achar(finalidade), [gruposMenu, finalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  // AMP: o da Junta lida no print; sem ela, o da competência da finalidade.
  const amp: AmpIS | '' = proposta?.amp || achada?.amp || '';
  const peritosDoAmpAtual = useMemo(() => (amp ? peritosDoAmp(peritos, amp) : []), [peritos, amp]);
  const perito = peritos.find(p => p.uid === peritoUid);
  const temConclusao = !!proposta?.temConclusao && !!laudo.trim();

  const dataEntrevista = data && hora ? `${data}T${hora}` : '';
  const status: StatusIS = temConclusao
    ? statusDaConclusao({ laudo: laudo.trim(), tis: tis.trim(), ds1a: tis.trim() ? ds1a.trim() : '' }, atual?.status)
    : statusDosDados(data ? dataEntrevista || `${data}T00:00` : '', atual ?? undefined);
  const reservar = !!data && data >= hojeISO() && STATUS_DE_AGENDA.includes(status);
  const ocupados = useMemo(() => ocupadosDe(inspecoes.filter(i => i.id !== proposta?.numero)), [inspecoes, proposta]);
  const duracao = duracaoDoGrupo(achada?.grupo);

  // ---- 1. Ler as fotos ----
  const ler = async () => {
    if (!foto1) return;
    setLendo(true); setErroLeitura('');
    try {
      const [d, c, grupos, restr] = await Promise.all([
        arquivoParaBase64IA(foto1).then(b => lerISDoSinais(b, foto1.type || 'image/png')),
        foto2 ? arquivoParaBase64IA(foto2).then(b => lerConclusaoDoSinais(b, foto2.type || 'image/png')) : Promise.resolve(undefined),
        carregarFinalidadesIS(),
        carregarRestricoesIS().then(opcoesDeRestricoes).catch(() => [] as string[]),
      ]);
      const { proposta: p, erro } = proporImportacao(d, c, grupos, restr);
      if (!p) { setErroLeitura(erro); return; }
      if (p.nip.length !== 8) { setErroLeitura('Não foi possível ler o NIP do inspecionado na foto da IS.'); return; }

      // Inspecionado pelo NIP; não achado: cadastra com a mesma foto.
      const achado = militares.find(m => m.id === p.nip);
      let id = achado?.id ?? '';
      if (!achado) {
        if (!podeCadastrarInspecionado) { setErroLeitura(`Inspecionado (NIP ${p.nip}) não cadastrado. Peça o cadastro a quem tem acesso a Inspecionados.`); return; }
        const [cq, oms] = await Promise.all([carregarCorposQuadros(), carregarOms()]);
        const preenchido = preencherInspecionadoDoSinais(d, cq, oms);
        if (preenchido.tipo !== 'militar') { setErroLeitura(`O print é de ${preenchido.tipo === 'dependente' ? 'um dependente' : 'um(a) pensionista'}: cadastre-o em Inspecionados (aba Dep/Pens.) e tente de novo.`); return; }
        const novo = militarDoPreenchimento(preenchido, cq);
        if (novo) { id = await criarMilitar(novo); setMilitarNovo(true); }
        else setCadastrandoComPrint(true);
      }

      const existente = inspecoes.find(i => i.id === p.numero);
      setOpcoesRestricoes(restr);
      setMilitarId(id);
      setFinalidade(p.finalidade || existente?.finalidade || '');
      setDataAbertura(p.dataAbertura || existente?.dataAbertura || '');
      const dataAtual = existente?.dataEntrevista?.slice(0, 10) ?? '';
      const dataLida = p.dataAgendamento || dataAtual;
      setData(dataLida);
      // Mesma data já gravada: mantém a hora e o perito; senão, quem está lendo (se for perito do AMP).
      setHora(dataLida && dataLida === dataAtual ? existente!.dataEntrevista.slice(11, 16) : dataLida && dataLida < hojeISO() ? '08:00' : '');
      setPeritoUid(existente?.peritoUid || '');
      setLaudo(p.laudo); setDataLaudo(p.dataLaudo || (p.laudo ? existente?.dataLaudo || '' : '')); setRestricoes(p.restricoes); setTis(p.tis); setDs1a(p.ds1a);
      setProposta(p);
    } catch (e: any) {
      setErroLeitura(e?.message || 'Não foi possível ler as fotos.');
    } finally {
      setLendo(false);
    }
  };

  // Perito padrão: o da IS, ou quem está usando (se atende o AMP). Mudando o AMP, o que não serve sai.
  useEffect(() => {
    if (!proposta) return;
    setPeritoUid(atualUid => {
      if (atualUid && peritosDoAmpAtual.some(p => p.uid === atualUid)) return atualUid;
      return peritosDoAmpAtual.find(p => p.uid === usuario.uid)?.uid ?? '';
    });
  }, [proposta, peritosDoAmpAtual]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 2. Gravar ----
  const validar = (): Erros => {
    const e: Erros = {};
    if (!militar) e.militar = 'Cadastre o inspecionado para continuar.';
    if (!achada) e.finalidade = 'Selecione a finalidade.';
    if (!dataAbertura) e.dataAbertura = 'Informe a data de abertura.';
    if (data && !hora) e.hora = 'Escolha o horário da entrevista.';
    if (data && !perito) e.perito = 'Escolha o perito.';
    if (reservar && perito && data && hora) {
      const t = turnoDoSlot(hora);
      const estado = estadoDoSlot(perito.uid, data, hora, !!t && peritoAtendeNoTurno(config, perito.uid, data, t), bloqueios, ocupados, duracao);
      if (estado !== 'livre') e.hora = estado === 'ocupado' ? `${perito.usuario} já tem IS neste horário.` : estado === 'bloqueado' ? 'Esse horário está bloqueado.' : estado === 'nao_cabe' ? `A entrevista (${duracao} min) não cabe no turno a partir deste horário.` : `${perito.usuario} não atende neste turno.`;
    }
    return e;
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0 || !proposta || !militar || !achada || !amp) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#form-is-foto [aria-invalid="true"]')?.focus());
      return;
    }
    setSalvando(true);
    try {
      const conclusao = temConclusao;
      const restricoesFinal = conclusao && mostraRestricoes({ grupoFinalidade: achada.grupo }) ? juntarRestricoes(separarRestricoes(restricoes)) : '';
      const salva = await importarInspecao(proposta.numero, {
        dataAbertura, dataEntrevista, finalidade: achada.finalidade, grupoFinalidade: achada.grupo, amp,
        peritoUid: perito?.uid ?? '', peritoNome: perito?.usuario ?? '', peritoGmail: perito?.gmail ?? '',
        inspecionadoId: militar.id, inspecionado: militar.inspecionado,
        laudo: conclusao ? laudo.trim() : '', dataLaudo: conclusao ? dataLaudo || hojeISO() : '',
        restricoes: restricoesFinal, tis: conclusao ? tis.trim() : '', ds1a: conclusao && tis.trim() ? ds1a.trim().toUpperCase() : '',
        status, criadoPor: usuario.usuario,
      }, atual, reservar);
      onSalva(salva, !atual, reservar);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível gravar a IS.' });
      setSalvando(false);
    }
  };

  const st = STATUS_IS[status];
  const conferindo = !!proposta;

  return (
    <>
      <Drawer
        title={conferindo ? `IS ${proposta!.numero}` : 'IS por foto'}
        icon="photo_camera"
        tituloExtra={conferindo ? <StatusTag tone={st.tom}>{st.rotulo}</StatusTag> : undefined}
        onClose={() => { if (!salvando && !lendo) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" className="max-md:hidden" onClick={onClose} disabled={salvando || lendo}>Cancelar</Button>
            {conferindo
              ? <AcoesRodape acoes={[{ id: 'salvar', rotulo: atual ? 'Atualizar IS' : 'Criar IS', icone: 'save', onClick: () => submeterFormulario('form-is-foto'), loading: salvando, disabled: !militar }]} />
              : <AcoesRodape acoes={[{ id: 'ler', rotulo: 'Ler fotos', icone: 'auto_awesome', onClick: () => void ler(), loading: lendo, disabled: !foto1 }]} />}
          </>
        )}
      >
        {!conferindo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoFoto rotulo="IS no SINAIS" arquivo={foto1} onArquivo={f => { setFoto1(f); setErroLeitura(''); }} disabled={lendo} />
              <CampoFoto rotulo="Conclusão (opcional)" arquivo={foto2} onArquivo={f => { setFoto2(f); setErroLeitura(''); }} disabled={lendo} />
            </div>
            {lendo && <p className="text-sm font-semibold text-navy" role="status">Lendo as fotos…</p>}
            {erroLeitura && <p role="alert" className="text-sm font-semibold text-wine">{erroLeitura}</p>}
          </div>
        ) : (
          <form id="form-is-foto" onSubmit={salvar} noValidate className="space-y-4">
            {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

            <div className="rounded-lg border border-line border-l-4 border-l-navy bg-thead p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-ink-3">Inspecionado</p>
                {militarNovo && <StatusTag tone="success">Cadastrado agora</StatusTag>}
                {atual && <StatusTag tone="neutral">IS já cadastrada</StatusTag>}
              </div>
              {militar
                ? <p className="text-sm font-bold text-navy break-words">{militar.inspecionado}</p>
                : militarId ? <p className="text-sm text-ink-3" role="status">Carregando…</p>
                : (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-wine" role="alert">{cadastrandoComPrint ? 'Complete o cadastro do inspecionado.' : (erros.militar || 'Inspecionado não cadastrado.')}</p>
                    {!cadastrandoComPrint && <Button variant="secondary" icon="person_add" onClick={() => setCadastrandoComPrint(true)}>Cadastrar</Button>}
                  </div>
                )}
            </div>

            {proposta!.avisos.length > 0 && (
              <ul className="space-y-0.5 text-xs text-ink-2 list-disc pl-5">
                {proposta!.avisos.map(a => <li key={a}>{a}</li>)}
              </ul>
            )}

            <CampoFinalidadeIS required value={finalidade} onChange={v => { setFinalidade(v); limpar('finalidade'); }} gruposMenu={gruposMenu} erro={erros.finalidade} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data de abertura" required error={erros.dataAbertura}>
                {a => <input {...a} type="date" max={hojeISO()} value={dataAbertura} onChange={e => { setDataAbertura(e.target.value); limpar('dataAbertura'); }} />}
              </Field>
              <Field label="Data da entrevista">
                {a => <input {...a} type="date" value={data} onChange={e => { setData(e.target.value); setHora(''); limpar('hora'); }} />}
              </Field>
            </div>

            {data && amp && (
              peritosDoAmpAtual.length === 0
                ? <p role="alert" className="text-sm font-semibold text-wine">Não há perito ativo para o AMP {amp}.</p>
                : (
                  <AvatarRadioGroup<string>
                    label={`Perito (${amp})`} error={erros.perito}
                    value={peritoUid} onChange={v => { if (v !== peritoUid) { setPeritoUid(v); if (reservar) setHora(''); } limpar('perito'); }}
                    options={peritosDoAmpAtual.map(opcaoAvatarDoPerito)}
                  />
                )
            )}

            {data && (reservar ? (
              <SeletorHorario
                semCampoData duracao={duracao} peritoUid={peritoUid} data={data} onData={setData} hora={hora} onHora={h => { setHora(h); limpar('hora'); }}
                config={config} bloqueios={bloqueios} ocupados={ocupados} erro={erros.hora}
              />
            ) : (
              <Field label="Horário da entrevista" required error={erros.hora}>
                {a => <input {...a} type="time" step={600} value={hora} onChange={e => { setHora(e.target.value); limpar('hora'); }} />}
              </Field>
            ))}

            {proposta!.temConclusao && (
              <fieldset className="border border-line rounded-xl p-3 space-y-4">
                <legend className="px-1 text-xs font-bold text-ink-3">Conclusão</legend>
                <Field label="Laudo">
                  {a => <textarea {...a} value={laudo} onChange={e => setLaudo(e.target.value)} className={`${a.className} min-h-[72px]`} />}
                </Field>
                {laudo.trim() && (
                  <>
                    <Field label="Data do laudo">
                      {a => <input {...a} type="date" max={hojeISO()} value={dataLaudo} onChange={e => setDataLaudo(e.target.value)} />}
                    </Field>
                    {achada && mostraRestricoes({ grupoFinalidade: achada.grupo }) && (
                      <MultiSelectCombobox
                        label="Restrições" opcoes={Array.from(new Set([...opcoesRestricoes, ...separarRestricoes(restricoes)]))}
                        selecionadas={separarRestricoes(restricoes)} onChange={l => setRestricoes(juntarRestricoes(l))}
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nº do TIS">
                        {a => <input {...a} type="text" value={tis} onChange={e => setTis(e.target.value.trim())} className={`${a.className} font-mono`} autoComplete="off" />}
                      </Field>
                      <Field label="DS-1a">
                        {a => <input {...a} type="text" value={ds1a} disabled={!tis.trim()} onChange={e => setDs1a(e.target.value.trim().toUpperCase())} className={`${a.className} font-mono uppercase`} autoComplete="off" />}
                      </Field>
                    </div>
                  </>
                )}
              </fieldset>
            )}
          </form>
        )}
      </Drawer>

      {cadastrandoComPrint && foto1 && (
        <MilitarCadastroForm
          printInicial={foto1}
          onClose={() => setCadastrandoComPrint(false)}
          onCriado={(_nome, id) => { setCadastrandoComPrint(false); setMilitarId(id); setMilitarNovo(true); limpar('militar'); }}
        />
      )}
    </>
  );
};
