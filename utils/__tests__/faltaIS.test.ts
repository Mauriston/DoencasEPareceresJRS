import { describe, expect, it } from 'vitest';
import {
  OBS_CANCELADA_FALTA, TAG_MINUTA_FALTA_PENDENTE, camposCancelamentoPorFalta, ehFaltaIS, observacoesComFalta,
  podeRegistrarFalta, tagsSemMinutaFalta, temMinutaFaltaPendente,
} from '../faltaIS';

describe('falta na IS agendada → cancelada por falta', () => {
  it('observações: insere "IS CANCELADA POR FALTA" sem apagar nem duplicar', () => {
    expect(observacoesComFalta('')).toBe(OBS_CANCELADA_FALTA);
    expect(observacoesComFalta('Trouxe exames.')).toBe(`${OBS_CANCELADA_FALTA}\nTrouxe exames.`);
    expect(observacoesComFalta('IS cancelada por falta')).toBe('IS cancelada por falta');
  });
  it('campos: motivo falta + tag da pendência (sem duplicar, mantendo as demais)', () => {
    const c = camposCancelamentoPorFalta({ observacoes: '', tags: ['OUTRA'] });
    expect(c).toEqual({ observacoes: OBS_CANCELADA_FALTA, motivoCancelamento: 'falta', tags: ['OUTRA', TAG_MINUTA_FALTA_PENDENTE] });
    expect(camposCancelamentoPorFalta({ tags: [TAG_MINUTA_FALTA_PENDENTE] }).tags).toEqual([TAG_MINUTA_FALTA_PENDENTE]);
  });
  it('é falta: cancelada por falta e o status antigo "Faltou"; cancelamento por prazo não é', () => {
    expect(ehFaltaIS({ status: 'cancelada', motivoCancelamento: 'falta' })).toBe(true);
    expect(ehFaltaIS({ status: 'faltou' })).toBe(true);
    expect(ehFaltaIS({ status: 'cancelada' })).toBe(false);
  });
  it('pendência da minuta: tag presente; sai ao marcar enviada', () => {
    expect(temMinutaFaltaPendente({ tags: [TAG_MINUTA_FALTA_PENDENTE] })).toBe(true);
    expect(temMinutaFaltaPendente({})).toBe(false);
    expect(tagsSemMinutaFalta(['A', TAG_MINUTA_FALTA_PENDENTE])).toEqual(['A']);
  });
  it('só em IS agendada/reagendada com entrevista', () => {
    expect(podeRegistrarFalta({ status: 'agendada', dataEntrevista: '2026-11-20T08:00' })).toBe(true);
    expect(podeRegistrarFalta({ status: 'reagendada', dataEntrevista: '2026-11-20T08:00' })).toBe(true);
    expect(podeRegistrarFalta({ status: 'agendada' })).toBe(false);
    expect(podeRegistrarFalta({ status: 'aberta', dataEntrevista: '2026-11-20T08:00' })).toBe(false);
  });
});

import { faltaSemEmail } from '../emailFaltasHNRe';
import { faltasNoIntervalo } from '../painel';
describe('falta cancelada nas demais regras', () => {
  it('e-mail de faltas do HNRe continua valendo para a IS cancelada por falta', () => {
    expect(faltaSemEmail({ status: 'cancelada', motivoCancelamento: 'falta', dataEntrevista: '2026-11-20T08:00' })).toBe(true);
    expect(faltaSemEmail({ status: 'cancelada', dataEntrevista: '2026-11-20T08:00' })).toBe(false);
  });
  it('painel: cancelada por falta conta como falta; cancelada por prazo não', () => {
    const base = { id: 'x', dataAbertura: '2026-11-01', dataEntrevista: '2026-11-20T08:00', dataFinalizacao: '', situacao: 'finalizada', finalidade: '', grupoFinalidade: '', peritoUid: '', peritoNome: '', amp: 'JRS' } as any;
    const j = { inicio: '2026-11-01', fim: '2026-11-30' } as any;
    expect(faltasNoIntervalo([{ ...base, status: 'cancelada', motivoCancelamento: 'falta' }], j)).toEqual({ faltas: 1, agendadas: 1 });
    expect(faltasNoIntervalo([{ ...base, status: 'cancelada' }], j)).toEqual({ faltas: 0, agendadas: 0 });
  });
});
