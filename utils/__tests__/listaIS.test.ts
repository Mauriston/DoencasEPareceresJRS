// Lista de Inspeções (components/inspecoes/listaIS.ts): Realizando Exames como aberta sem agendamento.
import { describe, expect, it } from 'vitest';
import { agruparAtivasIS, etapaIS, prazoIS } from '../../components/inspecoes/listaIS';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';

const is = (id: string, status: string, dataAbertura: string): InspecaoRecord =>
  ({ id, is: Number(id.charCodeAt(0)), status, situacao: 'aberta', dataAbertura, dataEntrevista: '', grupoFinalidade: '' } as unknown as InspecaoRecord);

describe('Realizando Exames na lista', () => {
  it('sem barra de prazo; etapa "Exames · agendar"', () => {
    expect(prazoIS(is('a', 'realizando_exames', '2026-10-01'), '2026-11-15')).toBeNull();
    expect(prazoIS(is('a', 'aberta', '2026-11-10'), '2026-11-15')).not.toBeNull();
    expect(etapaIS('realizando_exames')).toEqual({ rotulo: 'Exames · agendar', passo: 0 });
  });
  it('entra nas abertas sem agendamento, depois das Abertas', () => {
    const grupos = agruparAtivasIS([is('a', 'realizando_exames', '2026-10-01'), is('b', 'aberta', '2026-11-14')], '2026-11-15');
    const abertas = grupos.find(g => g.tipo === 'abertas');
    expect(abertas?.itens.map(i => i.id)).toEqual(['b', 'a']);
  });
});
