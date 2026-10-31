// Ficheiro: components/inspecoes/InspecaoDetalhe.tsx
// Ficha de uma IS em barra lateral (bottom sheet no mobile): situação e prazo, dados da entrevista,
// estado da sincronização com o Google Agenda, edição do andamento (status, laudo, restrições, TIS,
// DS-1a, observações) e as ações ligadas à IS: agendar/reagendar, minutas de mensagem, pedido de
// parecer e (Admin) apagar.
import React, { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { StatusTag } from '@/components/ui/StatusTag';
import { atualizarInspecao, type InspecaoRecord } from '@/services/firestoreInspecoes';
import { carregarRestricoesIS } from '@/utils/corposQuadros';
import {
  STATUS_IS, STATUS_ESCOLHIVEIS, situacaoDoStatus, SITUACOES_IS, statusEfetivoIS, diasEmAberto, prazoAtrasoDias, dataBr, dataHoraBr, duracaoDaIS, horaFimEntrevista, horaDeEntrevista, formatTis, tisValido, prefixoAnoTis, hojeISO,
  type StatusIS,
} from '@/utils/inspecoes';

interface Props {
  inspecao: InspecaoRecord;
  permissoes: { editar: boolean; agendar: boolean; minuta: boolean; parecer: boolean; apagar: boolean };
  onClose: () => void;
  onAgendar: () => void;
  onMinutaCancelamento: () => void;
  onMinutaResultado: () => void;
  onSolicitarParecer: () => void;
  onSincronizar: () => void;
  /** A situação (Em andamento/Finalizada) mudou: o evento do Google Agenda muda de título e cor. */
  onSituacaoMudou: (is: InspecaoRecord) => void;
  onApagar: () => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

const Linha: React.FC<{ rotulo: string; children?: React.ReactNode }> = ({ rotulo, children }) => {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
      <dd className="text-sm text-ink break-words">{children}</dd>
    </div>
  );
};

export const InspecaoDetalhe: React.FC<Props> = ({ inspecao: is, permissoes, onClose, onAgendar, onMinutaCancelamento, onMinutaResultado, onSolicitarParecer, onSincronizar, onSituacaoMudou, onApagar, onAviso }) => {
  const efetivo = statusEfetivoIS(is);
  const info = STATUS_IS[efetivo];
  const finalizada = is.situacao === 'finalizada';
  const editavel = permissoes.editar && is.status !== 'cancelada';

  const [restricoesOpcoes, setRestricoesOpcoes] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusIS>(is.status);
  const [dataLaudo, setDataLaudo] = useState(is.dataLaudo);
  const [laudo, setLaudo] = useState(is.laudo);
  const [restricoes, setRestricoes] = useState(is.restricoes);
  const [tis, setTis] = useState(is.tis);
  const [ds1a, setDs1a] = useState(is.ds1a);
  const [observacoes, setObservacoes] = useState(is.observacoes);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarRestricoesIS().then(setRestricoesOpcoes).catch(() => setRestricoesOpcoes([])); }, []);
  // A IS foi reagendada/alterada por outro lugar: reflete o status atual no menu.
  useEffect(() => { setStatus(is.status); }, [is.status]);

  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));
  const sujo = status !== is.status || dataLaudo !== is.dataLaudo || laudo !== is.laudo || restricoes !== is.restricoes || tis !== is.tis || ds1a !== is.ds1a || observacoes !== is.observacoes;

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    // Nº antigo, de outro formato, só é cobrado se for alterado.
    if (tis && tis !== is.tis && !tisValido(tis)) e.tis = `O Nº do TIS tem o formato ${prefixoAnoTis()}.000.N (um ou mais dígitos depois do 2º ponto).`;
    if (is.dataEntrevista && status === 'aberta') e.status = 'A IS já tem entrevista marcada; use Agendada ou Reagendada.';
    if (!is.dataEntrevista && (status === 'agendada' || status === 'reagendada')) e.status = 'Para agendar, use o botão Agendar (escolhe perito, data e horário).';
    if (status === 'tis_assinado' && !tis.trim()) e.tis = 'Informe o Nº do TIS para marcar "TIS assinado".';
    if (dataLaudo && dataLaudo > hojeISO()) e.dataLaudo = 'A data do laudo não pode ser futura.';
    return e;
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) return;
    setSalvando(true);
    try {
      await atualizarInspecao(is.id, { status, dataLaudo, laudo: laudo.trim(), restricoes, tis, ds1a: ds1a.trim(), observacoes: observacoes.trim() });
      onAviso(`IS ${is.is} atualizada.`);
      if (is.dataEntrevista && situacaoDoStatus(status) !== is.situacao) onSituacaoMudou({ ...is, status, situacao: situacaoDoStatus(status) });
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível salvar.' });
    } finally {
      setSalvando(false);
    }
  };

  const dias = diasEmAberto(is.dataAbertura);
  const prazo = prazoAtrasoDias(is.grupoFinalidade);

  return (
    <Drawer
      title={`IS ${is.is}`}
      icon="event_available"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          {editavel && <Button type="submit" form="form-editar-is" icon="save" loading={salvando} disabled={!sujo}>Salvar alterações</Button>}
        </>
      )}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag tone={info.tom}>{info.rotulo}</StatusTag>
          <StatusTag tone="neutral">{SITUACOES_IS.find(s => s.id === info.situacao)?.rotulo}</StatusTag>
          <StatusTag tone="neutral">{is.amp}</StatusTag>
        </div>

        {efetivo === 'atrasada' && (
          <p role="status" className="bg-wine/10 border border-wine/30 rounded-lg p-3 text-sm text-wine font-semibold">
            Aberta há {dias} dias sem agendamento (prazo: {prazo} dias{is.grupoFinalidade === 'Benefícios' ? ', finalidade de Benefícios' : ''}). Agende a entrevista ou gere a minuta de cancelamento.
          </p>
        )}
        {is.status === 'aberta' && efetivo !== 'atrasada' && (
          <p className="text-xs text-ink-3">Aberta há {dias} dia{dias !== 1 ? 's' : ''}; vence em {Math.max(0, prazo - dias + 1)} dia{prazo - dias + 1 !== 1 ? 's' : ''} sem agendamento (prazo de {prazo} dias).</p>
        )}

        <dl className="space-y-3">
          <Linha rotulo="Inspecionado">{is.inspecionado}</Linha>
          <Linha rotulo="Finalidade">{is.finalidade}{is.grupoFinalidade ? ` — ${is.grupoFinalidade}` : ''}</Linha>
          <Linha rotulo="Data de abertura">{dataBr(is.dataAbertura)}</Linha>
          <Linha rotulo="Entrevista">{is.dataEntrevista ? `${dataHoraBr(is.dataEntrevista)}${duracaoDaIS(is) > 20 ? ` às ${horaFimEntrevista(horaDeEntrevista(is.dataEntrevista), duracaoDaIS(is))} (${duracaoDaIS(is)} min)` : ''} — ${is.peritoNome}` : is.peritoNome ? `Não agendada — perito: ${is.peritoNome}` : 'Não agendada'}</Linha>
          {is.dataEntrevista && (
            <Linha rotulo="Google Agenda (JRS/HNRe)">
              {is.agendaSincronizada && is.eventoAgendaId ? 'Sincronizado' : is.agendaSincronizada === false ? 'Falha na sincronização' : 'Ainda não sincronizado'}
              {!is.peritoGmail && ' · perito sem Gmail cadastrado (não é convidado)'}
              {permissoes.agendar && !(is.agendaSincronizada && is.eventoAgendaId) && (
                <> · <button type="button" onClick={onSincronizar} className="font-bold text-navy underline min-h-[24px]">Sincronizar agora</button></>
              )}
            </Linha>
          )}
        </dl>

        <div className="flex flex-wrap gap-2">
          {permissoes.agendar && !finalizada && <Button icon="event" onClick={onAgendar}>{is.dataEntrevista ? 'Reagendar' : 'Agendar'}</Button>}
          {permissoes.minuta && efetivo === 'atrasada' && <Button variant="destructive" icon="mail" onClick={onMinutaCancelamento}>Minuta de cancelamento</Button>}
          {permissoes.minuta && is.status !== 'cancelada' && (is.laudo || is.tis) && <Button variant="secondary" icon="mail" onClick={onMinutaResultado}>Minuta de resultado</Button>}
          {permissoes.parecer && is.status !== 'cancelada' && <Button variant="secondary" icon="assignment_add" onClick={onSolicitarParecer}>Solicitar parecer</Button>}
        </div>

        {editavel ? (
          <form id="form-editar-is" onSubmit={salvar} noValidate className="space-y-4 border-t border-line pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-3">Andamento e resultado</h3>
            {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}
            <Field label="Status" error={erros.status}>
              {a => (
                <select {...a} value={status} onChange={e => { setStatus(e.target.value as StatusIS); limpar('status'); }}>
                  {STATUS_ESCOLHIVEIS.map(s => <option key={s} value={s}>{STATUS_IS[s].rotulo}</option>)}
                </select>
              )}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data do laudo" error={erros.dataLaudo}>
                {a => <input {...a} type="date" max={hojeISO()} value={dataLaudo} onChange={e => { setDataLaudo(e.target.value); limpar('dataLaudo'); }} />}
              </Field>
              <Field label="Restrições">
                {a => (
                  <select {...a} value={restricoes} onChange={e => setRestricoes(e.target.value)}>
                    <option value="">Selecione…</option>
                    {restricoes && !restricoesOpcoes.includes(restricoes) && <option value={restricoes}>{restricoes}</option>}
                    {restricoesOpcoes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Laudo">
              {a => <textarea {...a} value={laudo} onChange={e => setLaudo(e.target.value)} className={`${a.className} min-h-[88px]`} />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nº do TIS" error={erros.tis} help={`Formato ${prefixoAnoTis()}.000.N — digite só o final`}>
                {a => <input {...a} type="text" inputMode="numeric" value={tis} onChange={e => { setTis(formatTis(e.target.value, tis)); limpar('tis'); }} placeholder={`${prefixoAnoTis()}.000.0`} maxLength={14} className={`${a.className} font-mono`} />}
              </Field>
              <Field label="DS-1a">
                {a => <input {...a} type="text" value={ds1a} onChange={e => setDs1a(e.target.value)} autoComplete="off" />}
              </Field>
            </div>
            <Field label="Observações">
              {a => <textarea {...a} value={observacoes} onChange={e => setObservacoes(e.target.value)} className={`${a.className} min-h-[72px]`} />}
            </Field>
          </form>
        ) : (
          <dl className="space-y-3 border-t border-line pt-4">
            <Linha rotulo="Data do laudo">{dataBr(is.dataLaudo)}</Linha>
            <Linha rotulo="Laudo"><span className="whitespace-pre-line">{is.laudo}</span></Linha>
            <Linha rotulo="Restrições">{is.restricoes}</Linha>
            <Linha rotulo="Nº do TIS">{is.tis}</Linha>
            <Linha rotulo="DS-1a">{is.ds1a}</Linha>
            <Linha rotulo="Observações"><span className="whitespace-pre-line">{is.observacoes}</span></Linha>
          </dl>
        )}

        {permissoes.apagar && (
          <div className="border-t border-line pt-4">
            <Button variant="destructive" icon="delete" onClick={onApagar}>Apagar IS</Button>
            <p className="mt-1 text-xs text-ink-3">Definitivo (só Admin). Para encerrar uma IS atrasada, prefira a minuta de cancelamento.</p>
          </div>
        )}
      </div>
    </Drawer>
  );
};
