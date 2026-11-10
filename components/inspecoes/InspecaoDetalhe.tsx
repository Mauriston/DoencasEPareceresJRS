// Ficheiro: components/inspecoes/InspecaoDetalhe.tsx
// Ficha de uma IS em barra lateral (bottom sheet no mobile). Título "IS nº" com o chip do status ao lado.
//  1. Dados da IS: inspecionado · OM (negrito), finalidade, abertura, data da entrevista e data do laudo.
//  2. Conclusão da IS (salva sozinha, sem botão): cards da entrevista gravada e dos pareceres pedidos a
//     partir desta IS, Laudo, Auditoria | JSD, Restrições (lista suspensa com caixas de seleção), Nº do TIS,
//     DS-1a e Observações. O status muda automaticamente (regras puras em utils/conclusaoIS.ts); com o DS-1a
//     (TIS assinado) ou cancelada, nada é editável até "Reabrir IS" (Admin, menu da tabela); só leitura, os
//     campos preenchidos aparecem como texto (rótulo + valor) e os vazios somem.
// Rodapé (AcoesRodape: linha no desktop, FAB no mobile): Minuta MSG · Parecer · Gravar Entrevista (cada um
// só quando cabe). Fecha no X ou fora.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from '../ui/Drawer';
import { AcoesRodape, type AcaoRodape } from '../ui/AcoesRodape';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { StatusTag } from '../ui/StatusTag';
import { RestricoesSelect } from './RestricoesSelect';
import { SecaoEntrevista, cardConclusaoClass, pedidoDeGravacao, type PedidoGravacao } from './entrevista/SecaoEntrevista';
import { ParecerDetalhe } from '../pareceres/ParecerDetalhe';
import { useNav } from '../../context/NavContext';
import { atualizarInspecao, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { marcarConcluido, observarPareceresDaIS, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { carregarRestricoesIS } from '../../utils/corposQuadros';
import {
  STATUS_IS, statusEfetivoIS, dataBr, formatTis, tisValido, prefixoAnoTis, hojeISO, dataDeEntrevista,
} from '../../utils/inspecoes';
import {
  conclusaoTravada, encaminhamentoDoStatus, juntarRestricoes, mostraEncaminhamento, mostraRestricoes, patchConclusao, patchEncaminhamento,
  separarRestricoes, type CampoConclusao, type Encaminhamento, type EstadoConclusao, type ResultadoConclusao,
} from '../../utils/conclusaoIS';

export interface PermissoesDetalheIS {
  editar: boolean;
  minuta: boolean;
  parecer: boolean;
  /** Entrevista gravada (Admin e user_medicos). */
  entrevista: boolean;
}

interface Props {
  inspecao: InspecaoRecord;
  /** Sigla da OM do inspecionado. */
  om?: string;
  permissoes: PermissoesDetalheIS;
  onClose: () => void;
  onMinuta: () => void;
  onSolicitarParecer: () => void;
  onDuplicarParecer: (p: ParecerRecord) => void;
  /** A situação (Em andamento/Finalizada) mudou: o evento do Google Agenda muda de título e cor. */
  onSituacaoMudou: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

/** Minuta MSG: com Nº do TIS e DS-1a, ou IS cancelada. */
export const mostraMinutaMsg = (is: Pick<InspecaoRecord, 'tis' | 'ds1a' | 'status'>): boolean => (!!is.tis?.trim() && !!is.ds1a?.trim()) || is.status === 'cancelada';
/** Parecer e Gravar Entrevista: só com a IS Agendada ou Reagendada. */
export const fasesDeEntrevista = (is: Pick<InspecaoRecord, 'status'>): boolean => is.status === 'agendada' || is.status === 'reagendada';

const Linha: React.FC<{ rotulo: string; children?: React.ReactNode; className?: string }> = ({ rotulo, children, className = '' }) => (
  <div className={className}>
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words">{children || '—'}</dd>
  </div>
);

/** Texto longo (laudo, observações) em modo leitura: preserva as quebras de linha. */
const LinhaTexto: React.FC<{ rotulo: string; valor: string }> = ({ rotulo, valor }) => (
  <dl>
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words whitespace-pre-line">{valor}</dd>
  </dl>
);

/**
 * O Drawer só aceita título em texto: o chip do status vai para a barra do topo, ao lado do título,
 * por portal num elemento criado logo após o <h2> do painel.
 */
const useVagaNoTitulo = (ancora: React.RefObject<HTMLElement | null>) => {
  const [vaga, setVaga] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const h2 = ancora.current?.closest('[role="dialog"]')?.querySelector('h2');
    if (!h2?.parentElement) return;
    const el = document.createElement('span');
    el.className = 'shrink-0 flex items-center';
    h2.insertAdjacentElement('afterend', el);
    setVaga(el);
    return () => { el.remove(); };
  }, [ancora]);
  return vaga;
};

const ATRASO_AUTOSAVE_MS = 1000;

/** Campos da Conclusão sempre como texto (docs antigos podem não ter algum). */
const comPadroes = (i: InspecaoRecord): EstadoConclusao => ({
  status: i.status, dataEntrevista: i.dataEntrevista || '', finalidade: i.finalidade || '', grupoFinalidade: i.grupoFinalidade || '',
  dataLaudo: i.dataLaudo || '', laudo: i.laudo || '', restricoes: i.restricoes || '', tis: i.tis || '', ds1a: i.ds1a || '', observacoes: i.observacoes || '',
});

/** Campo de texto com gravação automática: ~1 s sem digitar ou ao sair do campo. */
const useCampoAuto = (remoto: string, salvar: (valor: string) => void) => {
  const [valor, setValor] = useState(remoto);
  const editando = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const atual = useRef(valor);
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  // Mudança vinda do banco (outro campo apagou este, outro usuário…) só entra fora da digitação.
  useEffect(() => { if (!editando.current) { setValor(remoto); atual.current = remoto; } }, [remoto]);

  const confirmar = () => {
    if (timer.current !== undefined) { window.clearTimeout(timer.current); timer.current = undefined; }
    salvarRef.current(atual.current);
  };
  // Fechou o detalhe com gravação pendente: grava.
  useEffect(() => () => { if (timer.current !== undefined) confirmar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    valor,
    onChange: (v: string) => {
      editando.current = true;
      atual.current = v;
      setValor(v);
      if (timer.current !== undefined) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(confirmar, ATRASO_AUTOSAVE_MS);
    },
    onBlur: () => { editando.current = false; confirmar(); },
  };
};

type EstadoGravacao = 'ocioso' | 'salvando' | 'salvo' | 'erro';

export const InspecaoDetalhe: React.FC<Props> = ({ inspecao: is, om, permissoes, onClose, onMinuta, onSolicitarParecer, onDuplicarParecer, onSituacaoMudou, onAviso }) => {
  const nav = useNav();
  const efetivo = statusEfetivoIS(is);
  const info = STATUS_IS[efetivo];
  const travado = conclusaoTravada(is.status);
  const editavel = permissoes.editar && !travado;
  const somenteLeitura = !editavel;
  const ancoraRef = useRef<HTMLDivElement>(null);
  const vagaTitulo = useVagaNoTitulo(ancoraRef);

  const [restricoesOpcoes, setRestricoesOpcoes] = useState<string[]>([]);
  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  const [parecerAbertoId, setParecerAbertoId] = useState<string | null>(null);
  const [gravacao, setGravacao] = useState<PedidoGravacao>(null);
  const [estado, setEstado] = useState<EstadoGravacao>('ocioso');
  const [erroTis, setErroTis] = useState('');

  useEffect(() => { carregarRestricoesIS().then(setRestricoesOpcoes).catch(() => setRestricoesOpcoes([])); }, []);
  useEffect(() => observarPareceresDaIS(is.id, setPareceres, () => setPareceres([])), [is.id]);

  // Estado mais recente da IS (banco + gravações já disparadas): as regras partem dele.
  const atualRef = useRef<InspecaoRecord>(is);
  useEffect(() => { atualRef.current = is; }, [is]);
  const pareceresRef = useRef(pareceres);
  pareceresRef.current = pareceres;
  const fila = useRef<Promise<void>>(Promise.resolve());

  /** Grava, em fila, o patch calculado a partir do estado mais recente. */
  const gravar = (calcular: (atual: InspecaoRecord) => ResultadoConclusao) => {
    fila.current = fila.current.then(async () => {
      const atual = atualRef.current;
      const { patch, concluirPareceres } = calcular(atual);
      if (Object.keys(patch).length === 0) return;
      atualRef.current = { ...atual, ...patch };
      setEstado('salvando');
      try {
        await atualizarInspecao(atual.id, patch);
        setEstado('salvo');
        if (patch.situacao && patch.situacao !== atual.situacao && atual.dataEntrevista) onSituacaoMudou({ ...atualRef.current });
        if (concluirPareceres) {
          const abertos = pareceresRef.current.filter(p => p.status === 'solicitado');
          await Promise.all(abertos.map(p => marcarConcluido(p.id, true, nav?.authUser?.nome || ''))).catch(() => onAviso('Parecer não marcado como concluído.', 'error'));
        }
      } catch (e: any) {
        atualRef.current = atual;
        setEstado('erro');
        onAviso(e?.message || 'Não foi possível salvar.', 'error');
      }
    });
  };
  const gravarCampo = (campo: CampoConclusao, valor: string) => gravar(atual => patchConclusao(comPadroes(atual), campo, valor, hojeISO()));

  const laudo = useCampoAuto(is.laudo || '', v => gravarCampo('laudo', v));
  const ds1a = useCampoAuto(is.ds1a || '', v => gravarCampo('ds1a', v));
  const observacoes = useCampoAuto(is.observacoes || '', v => gravarCampo('observacoes', v));
  const tis = useCampoAuto(is.tis || '', v => {
    const t = v.trim();
    if (t === (atualRef.current.tis || '')) { setErroTis(''); return; }
    if (t && !tisValido(t)) { setErroTis(`Formato ${prefixoAnoTis()}.000.N`); return; }
    setErroTis('');
    gravarCampo('tis', t);
  });

  const estadoConclusao = comPadroes(is);
  const comEncaminhamento = mostraEncaminhamento(estadoConclusao);
  const comRestricoes = mostraRestricoes(estadoConclusao);
  const restricoesMarcadas = separarRestricoes(is.restricoes || '');
  const opcoesRestricoes = [...restricoesOpcoes, ...restricoesMarcadas.filter(r => !restricoesOpcoes.includes(r))];
  const alternarRestricao = (r: string, marcada: boolean) => {
    const lista = marcada ? [...restricoesMarcadas, r] : restricoesMarcadas.filter(x => x !== r);
    gravarCampo('restricoes', juntarRestricoes(lista));
  };

  const parecerAberto = parecerAbertoId ? pareceres.find(p => p.id === parecerAbertoId) ?? null : null;
  const dataParecer = (p: ParecerRecord) => p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? dataBr(hojeISO());

  const acoes: AcaoRodape[] = [
    ...(permissoes.minuta && mostraMinutaMsg(is) ? [{ id: 'minuta', rotulo: 'Minuta MSG', icone: 'mail', variante: 'secondary' as const, onClick: onMinuta }] : []),
    ...(permissoes.parecer && fasesDeEntrevista(is) ? [{ id: 'parecer', rotulo: 'Parecer', icone: 'assignment_add', variante: 'secondary' as const, onClick: onSolicitarParecer }] : []),
    ...(permissoes.entrevista && fasesDeEntrevista(is) ? [{ id: 'gravar', rotulo: 'Gravar Entrevista', icone: 'mic', variante: 'primary' as const, onClick: () => setGravacao(pedidoDeGravacao()) }] : []),
  ];

  const encaminhamento = encaminhamentoDoStatus(is.status);
  const textoLaudo = is.laudo?.trim() || '';
  const textoObservacoes = is.observacoes?.trim() || '';

  return (
    <Drawer
      title={`IS ${is.is}`}
      icon="event_available"
      onClose={onClose}
      footer={acoes.length > 0 ? <AcoesRodape acoes={acoes} /> : undefined}
    >
      <div ref={ancoraRef} className="space-y-6">
        {vagaTitulo && createPortal(<StatusTag tone={info.tom}>{info.rotulo}</StatusTag>, vagaTitulo)}

        <section aria-labelledby={`dados-is-${is.id}`} className="space-y-3">
          <h3 id={`dados-is-${is.id}`} className="text-h3 font-bold text-navy">Dados da IS</h3>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
            <Linha rotulo="Inspecionado" className="col-span-3">
              {is.inspecionado ? <><span className="font-bold">{is.inspecionado}</span>{om ? ` · ${om}` : ''}</> : ''}
            </Linha>
            <Linha rotulo="Finalidade" className="col-span-3">{is.finalidade}</Linha>
            <Linha rotulo="Abertura IS">{dataBr(is.dataAbertura)}</Linha>
            <Linha rotulo="Entrevista">{is.dataEntrevista ? dataBr(dataDeEntrevista(is.dataEntrevista)) : ''}</Linha>
            <Linha rotulo="Laudo">{dataBr(is.dataLaudo)}</Linha>
          </dl>
        </section>

        <section aria-labelledby={`conclusao-is-${is.id}`} className="space-y-4 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 id={`conclusao-is-${is.id}`} className="text-h3 font-bold text-navy">Conclusão da IS</h3>
            <span role="status" className={`text-xs ${estado === 'erro' ? 'font-semibold text-wine' : 'text-ink-3'}`}>
              {estado === 'salvando' ? 'Salvando…' : estado === 'salvo' ? 'Salvo' : estado === 'erro' ? 'Erro' : ''}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 empty:hidden">
            {permissoes.entrevista && <SecaoEntrevista is={is} gravacao={gravacao} onGravacao={setGravacao} />}
            {pareceres.map(p => (
              <button key={p.id} type="button" onClick={() => setParecerAbertoId(p.id)} className={cardConclusaoClass}>
                <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">assignment</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy">Parecer Solicitado</span>
                  <span className="block text-xs text-ink-3">{dataParecer(p)}{statusEfetivo(p) === 'concluido' ? ' · concluído' : ''}</span>
                </span>
              </button>
            ))}
          </div>

          {somenteLeitura ? (
            <>
              {textoLaudo && <LinhaTexto rotulo="Laudo" valor={is.laudo || ''} />}
              {comEncaminhamento && encaminhamento && (
                <LinhaTexto rotulo="Encaminhamento" valor={encaminhamento === 'jsd' ? 'JSD' : 'Auditoria'} />
              )}
              {comRestricoes && restricoesMarcadas.length > 0 && <LinhaTexto rotulo="Restrições" valor={restricoesMarcadas.join(', ')} />}
              {(is.tis?.trim() || is.ds1a?.trim()) && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {is.tis?.trim() && <Linha rotulo="Nº do TIS"><span className="font-mono">{is.tis}</span></Linha>}
                  {is.ds1a?.trim() && <Linha rotulo="DS-1a">{is.ds1a}</Linha>}
                </dl>
              )}
              {textoObservacoes && <LinhaTexto rotulo="Observações" valor={is.observacoes || ''} />}
            </>
          ) : (
            <>
              <Field label="Laudo">
                {a => <textarea {...a} value={laudo.valor} onChange={e => laudo.onChange(e.target.value)} onBlur={laudo.onBlur} className={`${a.className} min-h-[88px]`} />}
              </Field>

              {comEncaminhamento && (
                <fieldset disabled={!!is.tis?.trim()} className="disabled:opacity-60">
                  <Segmented<Encaminhamento | ''>
                    ariaLabel="Encaminhamento"
                    value={encaminhamento ?? ''}
                    onChange={v => { if (v) gravar(atual => ({ patch: patchEncaminhamento(comPadroes(atual), v), concluirPareceres: false })); }}
                    options={[{ value: 'auditoria', label: 'Auditoria' }, { value: 'jsd', label: 'JSD' }]}
                  />
                </fieldset>
              )}

              {comRestricoes && (
                <RestricoesSelect opcoes={opcoesRestricoes} marcadas={restricoesMarcadas} onAlternar={alternarRestricao} />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nº do TIS" error={erroTis}>
                  {a => (
                    <input
                      {...a} type="text" inputMode="numeric" value={tis.valor} disabled={!is.laudo?.trim()}
                      onChange={e => { tis.onChange(formatTis(e.target.value, tis.valor)); setErroTis(''); }} onBlur={tis.onBlur}
                      placeholder={`${prefixoAnoTis()}.000.0`} maxLength={14} className={`${a.className} font-mono`}
                    />
                  )}
                </Field>
                <Field label="DS-1a">
                  {a => <input {...a} type="text" value={ds1a.valor} disabled={!is.tis?.trim()} onChange={e => ds1a.onChange(e.target.value)} onBlur={ds1a.onBlur} autoComplete="off" />}
                </Field>
              </div>

              <Field label="Observações">
                {a => <textarea {...a} value={observacoes.valor} onChange={e => observacoes.onChange(e.target.value)} onBlur={observacoes.onBlur} className={`${a.className} min-h-[72px]`} />}
              </Field>
            </>
          )}
        </section>
      </div>

      {parecerAberto && createPortal(
        <ParecerDetalhe
          parecer={parecerAberto}
          podeGerar={permissoes.parecer}
          onClose={() => setParecerAbertoId(null)}
          onAbrirPdf={() => { window.open(parecerAberto.pdfUrl, '_blank', 'noopener,noreferrer'); }}
          onConcluir={concluido => {
            marcarConcluido(parecerAberto.id, concluido, concluido ? nav?.authUser?.nome || '' : '')
              .then(() => onAviso(concluido ? 'Parecer concluído.' : 'Parecer reaberto.'))
              .catch((e: any) => onAviso(e?.message || 'Não foi possível alterar o parecer.', 'error'));
          }}
          onDuplicar={() => { setParecerAbertoId(null); onDuplicarParecer(parecerAberto); }}
        />,
        document.body,
      )}
    </Drawer>
  );
};
