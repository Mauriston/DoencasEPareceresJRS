// Ficheiro: components/inspecoes/BloqueiosDialog.tsx
// Bloqueios da agenda das IS: de um horário (slot de 20 min), de um turno completo ou do dia inteiro,
// para todos os peritos ou para um perito. Admin e Secretaria bloqueiam qualquer perito; um perfil médico
// (quando o Admin libera a funcionalidade) só bloqueia horários e turnos configurados para ele.
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { StatusTag } from '../ui/StatusTag';
import { criarBloqueio, apagarBloqueio } from '../../services/firestoreInspecoes';
import type { PeritoIS } from '../../services/peritosIS';
import {
  TURNOS, slotsDoTurno, hojeISO, ehDiaUtil, dataBr, nomeDiaSemana, peritoAtendeNoTurno, TODOS_PERITOS,
  type BloqueioAgenda, type ConfigAgenda, type Turno,
} from '../../utils/inspecoes';

type TipoBloqueio = 'horario' | 'turno' | 'dia';

interface Props {
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  /** Quem está bloqueando. */
  usuario: { uid: string; usuario: string; perfil: string };
  onClose: () => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const BloqueiosDialog: React.FC<Props> = ({ peritos, config, bloqueios, usuario, onClose, onAviso }) => {
  const amplo = usuario.perfil === 'admin' || usuario.perfil === 'user_secretaria';
  const [tipo, setTipo] = useState<TipoBloqueio>('turno');
  const [data, setData] = useState('');
  const [turno, setTurno] = useState<Turno>('manha');
  const [hora, setHora] = useState('');
  const [peritoUid, setPeritoUid] = useState(amplo ? TODOS_PERITOS : usuario.uid);
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));
  const futuros = useMemo(() => bloqueios.filter(b => b.data >= hojeISO()), [bloqueios]);
  const nomePerito = (uid: string) => (uid === TODOS_PERITOS ? 'Todos os peritos' : peritos.find(p => p.uid === uid)?.usuario ?? 'Perito');
  const podeApagar = (b: BloqueioAgenda) => amplo || b.peritoUid === usuario.uid;

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!data) e.data = 'Escolha a data.';
    else if (!ehDiaUtil(data)) e.data = `${nomeDiaSemana(data)} não tem expediente de IS.`;
    if (tipo === 'horario' && !hora) e.hora = 'Escolha o horário.';
    if (!motivo.trim()) e.motivo = 'Informe o motivo (ex.: feriado, congresso, licença).';
    if (!amplo && data && ehDiaUtil(data)) {
      // Perfil médico: só turnos configurados para ele.
      const turnos: Turno[] = tipo === 'dia' ? ['manha', 'tarde'] : [tipo === 'horario' ? (hora < '12:00' ? 'manha' : 'tarde') : turno];
      if (tipo === 'horario' && !hora) return e;
      if (!turnos.some(t => peritoAtendeNoTurno(config, usuario.uid, data, t))) e.data = 'Você não atende neste dia/turno; só é possível bloquear turnos configurados para você.';
    }
    return e;
  };

  const adicionar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await criarBloqueio({
        data, turno: tipo === 'dia' ? 'dia' : tipo === 'horario' ? (hora < '12:00' ? 'manha' : 'tarde') : turno,
        ...(tipo === 'horario' ? { hora } : {}),
        peritoUid, peritoNome: peritoUid === TODOS_PERITOS ? undefined : peritoUid === usuario.uid ? usuario.usuario : nomePerito(peritoUid),
        motivo: motivo.trim(), criadoPor: usuario.usuario,
      });
      onAviso('Bloqueio criado.');
      setMotivo(''); setHora('');
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível criar o bloqueio.' });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (b: BloqueioAgenda) => {
    try { await apagarBloqueio(b.id); onAviso('Bloqueio removido.'); }
    catch (err: any) { onAviso(err?.message || 'Não foi possível remover o bloqueio.', 'error'); }
  };

  const descricao = (b: BloqueioAgenda) => b.hora ? `Horário ${b.hora}` : b.turno === 'dia' ? 'Dia inteiro' : `Turno da ${TURNOS.find(t => t.id === b.turno)?.rotulo.toLowerCase()}`;

  return (
    <Dialog title="Bloqueios da agenda" icon="block" size="lg" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div className="space-y-6">
        <form onSubmit={adicionar} noValidate className="space-y-4">
          {!amplo && <p className="text-xs text-ink-3">Você só pode bloquear horários e turnos configurados para você.</p>}
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}
          <ChoiceGroup<TipoBloqueio>
            label="O que bloquear" value={tipo} onChange={v => { setTipo(v); limpar('hora'); }}
            options={[{ value: 'horario', label: 'Um horário' }, { value: 'turno', label: 'Um turno' }, { value: 'dia', label: 'Dia inteiro' }]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data" required error={erros.data}>
              {a => <input {...a} type="date" min={hojeISO()} value={data} onChange={e => { setData(e.target.value); limpar('data'); }} />}
            </Field>
            {tipo === 'turno' && (
              <ChoiceGroup<Turno> label="Turno" value={turno} onChange={setTurno} options={TURNOS.map(t => ({ value: t.id, label: `${t.rotulo} (${t.inicio}–${t.fim})` }))} />
            )}
            {tipo === 'horario' && (
              <Field label="Horário" required error={erros.hora}>
                {a => (
                  <select {...a} value={hora} onChange={e => { setHora(e.target.value); limpar('hora'); }}>
                    <option value="">Selecione…</option>
                    {TURNOS.map(t => (
                      <optgroup key={t.id} label={t.rotulo}>{slotsDoTurno(t.id).map(h => <option key={h} value={h}>{h}</option>)}</optgroup>
                    ))}
                  </select>
                )}
              </Field>
            )}
          </div>
          {amplo && (
            <Field label="Perito">
              {a => (
                <select {...a} value={peritoUid} onChange={e => setPeritoUid(e.target.value)}>
                  <option value={TODOS_PERITOS}>Todos os peritos</option>
                  {peritos.map(p => <option key={p.uid} value={p.uid}>{p.usuario}</option>)}
                </select>
              )}
            </Field>
          )}
          <Field label="Motivo" required error={erros.motivo}>
            {a => <input {...a} type="text" value={motivo} onChange={e => { setMotivo(e.target.value); limpar('motivo'); }} autoComplete="off" maxLength={80} />}
          </Field>
          <Button type="submit" icon="block" loading={salvando}>Bloquear</Button>
        </form>

        <section aria-label="Bloqueios vigentes">
          <h3 className="text-h3 font-bold text-navy mb-2">Bloqueios vigentes <span className="text-xs font-bold text-ink-3 bg-thead rounded-full px-2 py-0.5 align-middle">{futuros.length}</span></h3>
          {futuros.length === 0 ? <p className="text-ink-3">Nenhum bloqueio futuro.</p> : (
            <ul className="divide-y divide-line border border-line rounded-xl">
              {futuros.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy">{dataBr(b.data)} · {descricao(b)}</p>
                    <p className="text-xs text-ink-3 break-words">{b.motivo}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <StatusTag tone={b.peritoUid === TODOS_PERITOS ? 'danger' : 'attention'}>{b.peritoNome ?? nomePerito(b.peritoUid)}</StatusTag>
                    {podeApagar(b) && <Button variant="ghost" icon="delete" aria-label="Remover bloqueio" onClick={() => remover(b)} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
};
