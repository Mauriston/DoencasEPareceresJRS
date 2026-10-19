// Ficheiro: services/agendaGoogleIS.ts
// Sincroniza as IS com entrevista marcada com a agenda "JRS/HNRe" do Google Agenda do Admin.
// Quem fala com o Google Agenda é o Apps Script standalone (CodeConcursos.gs, ação
// "sincronizarEventoIS", que roda como o dono do script); o perito da IS entra como convidado,
// pelo Gmail cadastrado em Usuários. O id do evento volta e é gravado na IS, para que
// reagendar atualize o mesmo evento e cancelar o remova.
import { chamarScript } from './driveConcursos';
import { registrarSincronizacaoAgenda, type InspecaoRecord } from './firestoreInspecoes';
import { extrairNomeInspecionado } from '../utils/format';
import { dataDeEntrevista, horaDeEntrevista, horaFimSlot } from '../utils/inspecoes';

export const NOME_AGENDA_GOOGLE = 'JRS/HNRe';

type DadosEvento = Pick<InspecaoRecord, 'is' | 'finalidade' | 'inspecionado' | 'amp' | 'peritoNome' | 'peritoGmail' | 'dataEntrevista' | 'eventoAgendaId' | 'situacao'>;

const montar = (is: DadosEvento) => ({
  eventoId: is.eventoAgendaId || '',
  agenda: NOME_AGENDA_GOOGLE,
  // Título: {AMP}: {nome do inspecionado}, com ✅ na frente quando a IS está finalizada.
  titulo: `${is.situacao === 'finalizada' ? '✅ ' : ''}${is.amp}: ${extrairNomeInspecionado(is.inspecionado)}`,
  // Cor no Google Agenda: Em andamento = amarelo; Finalizada = verde.
  situacao: is.situacao,
  descricao: [`IS ${is.is}`, `Inspecionado: ${is.inspecionado}`, `AMP: ${is.amp}`, `Perito: ${is.peritoNome}`, `Finalidade: ${is.finalidade}`].join('\n'),
  data: dataDeEntrevista(is.dataEntrevista),
  horaInicio: horaDeEntrevista(is.dataEntrevista),
  horaFim: horaFimSlot(horaDeEntrevista(is.dataEntrevista)),
  convidados: is.peritoGmail ? [is.peritoGmail] : [],
});

/** Cria ou atualiza o evento da IS e grava o resultado na IS. Devolve false (sem lançar) se o Google Agenda falhar. */
export const sincronizarAgendaIS = async (is: InspecaoRecord): Promise<{ ok: boolean; erro?: string; semConvidado?: boolean }> => {
  if (!is.dataEntrevista) return { ok: true };
  try {
    const r = await chamarScript<{ eventoId: string }>('sincronizarEventoIS', montar(is));
    await registrarSincronizacaoAgenda(is.id, { eventoAgendaId: r.eventoId, agendaSincronizada: true });
    return { ok: true, semConvidado: !is.peritoGmail };
  } catch (e: any) {
    await registrarSincronizacaoAgenda(is.id, { agendaSincronizada: false }).catch(() => { /* a IS já foi salva */ });
    return { ok: false, erro: e?.message || 'Não foi possível sincronizar com o Google Agenda.' };
  }
};

/** Remove o evento do Google Agenda (IS cancelada ou apagada). */
export const removerEventoAgendaIS = async (is: Pick<InspecaoRecord, 'id' | 'eventoAgendaId'>): Promise<boolean> => {
  if (!is.eventoAgendaId) return true;
  try {
    await chamarScript('sincronizarEventoIS', { eventoId: is.eventoAgendaId, agenda: NOME_AGENDA_GOOGLE, remover: true });
    await registrarSincronizacaoAgenda(is.id, { eventoAgendaId: '', agendaSincronizada: true }).catch(() => { /* IS pode ter sido apagada */ });
    return true;
  } catch {
    return false;
  }
};
