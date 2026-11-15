// Ficheiro: components/inspecoes/EscolhaEntrevista.tsx
// Campo "Data Entrevista" do cadastro e do agendamento de IS, em três passos: (1) calendário do mês
// (abre no mês atual, com mês anterior/próximo) em que só os dias com horário livre de algum perito do
// AMP de competência podem ser escolhidos — cada um mostra quantas IS do AMP já estão agendadas nele;
// (2) os peritos com horário livre no dia; (3) os horários do perito (SeletorHorario: turnos
// configurados, bloqueios e slots ocupados por outras IS). Regras puras em utils/disponibilidadeAgenda.
import React, { useMemo } from 'react';
import { AvatarRadioGroup } from '../ui/AvatarRadioGroup';
import { CalendarioDisponibilidade } from './CalendarioDisponibilidade';
import { SeletorHorario } from './SeletorHorario';
import { opcaoAvatarDoPerito } from './InspecaoForm';
import type { PeritoIS } from '../../services/peritosIS';
import { contarISPorDia, peritosLivresNoDia, proximaDataLivre, type AgendaDisponibilidade } from '../../utils/disponibilidadeAgenda';
import { dataBr, hojeISO, nomeDiaSemana, DURACAO_SLOT_MIN, type BloqueioAgenda, type ConfigAgenda } from '../../utils/inspecoes';

interface Props {
  amp: string;
  /** Peritos do AMP de competência. */
  candidatos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  ocupados: Set<string>;
  /** IS cadastradas (para a contagem de agendadas por dia). */
  inspecoes: { id: string; amp: string; dataEntrevista: string; status: string }[];
  /** IS sendo reagendada (não entra na contagem). */
  ignorarId?: string;
  duracao?: number;
  data: string;
  peritoUid: string;
  hora: string;
  onData: (data: string) => void;
  onPerito: (uid: string) => void;
  onHora: (hora: string) => void;
  permitirDataPassada?: boolean;
  /** Mês aberto de início (padrão: o da data escolhida ou o mês atual). */
  mesInicial?: string;
  erroPerito?: string;
  erroHora?: string;
  /** Mostra "Limpar data" (a entrevista é opcional, ex.: no cadastro da IS). */
  permitirLimpar?: boolean;
}

export const EscolhaEntrevista: React.FC<Props> = ({
  amp, candidatos, config, bloqueios, ocupados, inspecoes, ignorarId, duracao = DURACAO_SLOT_MIN,
  data, peritoUid, hora, onData, onPerito, onHora, permitirDataPassada = false, mesInicial, erroPerito, erroHora, permitirLimpar = false,
}) => {
  const agenda: AgendaDisponibilidade = useMemo(() => ({ config, bloqueios, ocupados, duracao }), [config, bloqueios, ocupados, duracao]);
  const contagem = useMemo(() => contarISPorDia(inspecoes, { amp, ignorarId }), [inspecoes, amp, ignorarId]);
  // Cache por dia: o calendário consulta cada dia do mês a cada render.
  const cache = useMemo(() => new Map<string, PeritoIS[]>(), [candidatos, agenda]);
  const livresNoDia = (d: string): PeritoIS[] => {
    let l = cache.get(d);
    if (!l) { l = peritosLivresNoDia(candidatos, d, agenda); cache.set(d, l); }
    return l;
  };
  const proxima = useMemo(() => proximaDataLivre(hojeISO(), candidatos, agenda), [candidatos, agenda]);
  const peritosDoDia = data ? livresNoDia(data) : [];
  const deQuem = amp === 'JRS' ? 'da JRS' : 'do MPI';

  // Ao escolher o dia: mantém o perito se ele tem horário livre nele; com um só perito livre, já o escolhe.
  const escolherData = (d: string) => {
    onData(d);
    onHora('');
    const livres = livresNoDia(d);
    onPerito(livres.some(p => p.uid === peritoUid) ? peritoUid : livres.length === 1 ? livres[0].uid : '');
  };

  if (candidatos.length === 0) {
    return <p role="alert" className="text-sm font-semibold text-wine">Não há perito ativo para o AMP {amp}. Cadastre o usuário médico em Usuários.</p>;
  }

  const contagemDe = (d: string) => contagem.get(d) ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <span className="block text-xs font-semibold text-ink-3 mb-1">Data Entrevista (peritos {deQuem})</span>
        <CalendarioDisponibilidade
          valor={data} onChange={escolherData} disponivel={d => livresNoDia(d).length > 0}
          contagem={contagemDe} mesInicial={mesInicial || data || hojeISO()} permitirDataPassada={permitirDataPassada}
        />
        {data && permitirLimpar && (
          <p className="mt-1 text-xs text-ink-3">{nomeDiaSemana(data)}, {dataBr(data)} · <button type="button" onClick={() => { onData(''); onHora(''); }} className="font-bold text-navy underline min-h-[24px]">Limpar data</button></p>
        )}
        {!data && (proxima
          ? <p className="mt-1 text-xs text-ink-3">Próxima data livre: <button type="button" onClick={() => escolherData(proxima)} className="font-bold text-navy underline min-h-[24px]">{nomeDiaSemana(proxima)}, {dataBr(proxima)}</button></p>
          : <p role="status" className="mt-1 text-xs font-semibold text-wine">Nenhuma data livre nos próximos meses para o AMP {amp}. O Admin define os turnos dos peritos em Configurações → "Agenda das IS — turnos dos peritos".</p>)}
      </div>

      {data && peritosDoDia.length === 0 && !peritoUid && (
        <p role="alert" className="text-sm font-semibold text-wine">Nenhum perito {deQuem} tem horário livre em {dataBr(data)}. Escolha outra data.</p>
      )}
      {data && (peritosDoDia.length > 0 || peritoUid) && (
        <AvatarRadioGroup<string>
          label={`Perito com horário em ${dataBr(data)}`} error={erroPerito} value={peritoUid}
          onChange={v => { if (v !== peritoUid) { onPerito(v); onHora(''); } }}
          // O perito já escolhido continua na lista mesmo sem horário livre (ex.: pré-preenchido do calendário).
          options={[...peritosDoDia, ...candidatos.filter(p => p.uid === peritoUid && !peritosDoDia.includes(p))].map(opcaoAvatarDoPerito)}
        />
      )}

      {data && peritoUid && (
        <SeletorHorario
          semCampoData duracao={duracao} peritoUid={peritoUid} data={data} onData={onData} hora={hora} onHora={onHora}
          config={config} bloqueios={bloqueios} ocupados={ocupados} erro={erroHora}
        />
      )}
    </div>
  );
};
