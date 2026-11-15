// Ficheiro: utils/__tests__/painelExamesEmails.test.ts
// Agregações do Painel para o status "Realizando Exames" (guias entregues) e para os e-mails enviados e as
// guias geradas no Uso do app (uso_diario.emailsPorTipo / guiasGeradas).
import { describe, it, expect } from 'vitest';
import {
  janelaDoPeriodo, resumoExamesIS, emCursoPorEtapa, porPerito, resumoUso, enviosPorDia, rotuloTipoEmail,
  type ISPainel, type UsoDia,
} from '../painel';

const HOJE = '2026-11-14';
const MES = janelaDoPeriodo('mes', HOJE); // nov (1–14) vs. out (1–14)

let seq = 0;
const is = (p: Partial<ISPainel>): ISPainel => ({
  id: String(++seq), dataAbertura: '2026-11-01', dataEntrevista: '', dataFinalizacao: '',
  status: 'aberta', situacao: 'aberta', finalidade: 'Ingresso', grupoFinalidade: 'Ingresso', peritoUid: 'p1', peritoNome: 'CT A', amp: 'JRS', ...p,
});

describe('Realizando Exames (resumoExamesIS)', () => {
  const lista = [
    // Entregue em nov por e-mail, 3 dias após a abertura; ainda realizando exames.
    is({ status: 'realizando_exames', dataAbertura: '2026-11-02', temGuias: true, guiasEntregues: true, guiasEntreguesEm: '2026-11-05', guiasEntreguesVia: 'email' }),
    // Entregue em nov presencialmente (1 dia), já agendada para 10 dias depois da entrega.
    is({ status: 'agendada', situacao: 'andamento', dataAbertura: '2026-11-03', dataEntrevista: '2026-11-14T09:00', temGuias: true, guiasEntregues: true, guiasEntreguesEm: '2026-11-04', guiasEntreguesVia: 'presencial' }),
    // Entregue em out (período anterior), presencial, 6 dias após a abertura; entrevista em out, 4 dias depois.
    is({ status: 'agendada', situacao: 'andamento', dataAbertura: '2026-10-01', dataEntrevista: '2026-10-11T10:00', temGuias: true, guiasEntregues: true, guiasEntreguesEm: '2026-10-07', guiasEntreguesVia: 'presencial' }),
    // Guias geradas e não entregues.
    is({ status: 'aberta', temGuias: true, guiasEntregues: false }),
    // Cancelada não conta, mesmo com entrega no período.
    is({ status: 'cancelada', situacao: 'finalizada', guiasEntreguesEm: '2026-11-06', guiasEntreguesVia: 'email' }),
    // Sem guias (finalidade sem exames mínimos).
    is({ status: 'aberta' }),
  ];
  const r = resumoExamesIS(lista, MES);

  it('conta as IS realizando exames agora e as que aguardam a entrega das guias', () => {
    expect(r.agora).toBe(1);
    expect(r.aguardandoEntrega).toBe(1);
  });
  it('entradas no período pela data de entrega, contra o período anterior', () => {
    expect(r.entraram).toEqual({ atual: 2, anterior: 1 });
  });
  it('tempos médios: abertura → entrega (entregas do período) e entrega → data agendada (entrevistas do período)', () => {
    expect(r.aberturaAteGuias).toEqual({ atual: 2, anterior: 6 });
    expect(r.guiasAteAgendamento).toEqual({ atual: 10, anterior: 4 });
  });
  it('e-mail × presencial', () => {
    expect(r.via).toEqual({ email: 1, presencial: 1, pctEmail: { atual: 50, anterior: 0 } });
  });
  it('sem entregas: médias nulas e % sem base', () => {
    const v = resumoExamesIS([is({})], MES);
    expect(v.aberturaAteGuias.atual).toBeNull();
    expect(v.guiasAteAgendamento.atual).toBeNull();
    expect(v.via.pctEmail.atual).toBeNull();
  });
  it('o status aparece nas etapas em curso e não conta como entrevista realizada', () => {
    const etapas = emCursoPorEtapa(lista, HOJE);
    expect(etapas.find(e => e.chave === 'realizando_exames')).toMatchObject({ rotulo: 'Realizando exames', valor: 1 });
    const so = porPerito([is({ status: 'realizando_exames', dataEntrevista: '2026-11-10T09:00' })], MES);
    expect(so).toEqual([]);
  });
});

describe('Uso do app: e-mails enviados e guias geradas', () => {
  const d = (dia: string, x: Partial<UsoDia>): UsoDia => ({ dia, paginas: {}, acessosPorUsuario: {}, acoesPorUsuario: {}, ultimo: {}, ...x });
  const docs = [
    d('2026-11-14', { emailsPorTipo: { aberturaIS: 2, guiasInspecionado: 1 }, guiasGeradas: 3 }),
    d('2026-11-03', { emailsPorTipo: { aberturaIS: 1, resultadoIS: 4, nac: 0 }, guiasGeradas: 1 }),
    d('2026-10-05', { emailsPorTipo: { resultadoIS: 2 }, guiasGeradas: 2 }),
    // Dia antigo, sem os campos novos.
    d('2026-10-02', {}),
  ];
  const r = resumoUso(docs, [], MES, HOJE);

  it('totais do período contra o anterior', () => {
    expect(r.emails).toEqual({ atual: 8, anterior: 2 });
    expect(r.guias).toEqual({ atual: 4, anterior: 2 });
  });
  it('e-mails por tipo com os rótulos de TIPOS_EMAIL, sem tipos zerados', () => {
    expect(r.emailsPorTipo).toEqual([
      { chave: 'resultadoIS', rotulo: 'Resultado da IS ao inspecionado', valor: 4 },
      { chave: 'aberturaIS', rotulo: 'Abertura de IS ao inspecionado', valor: 3 },
      { chave: 'guiasInspecionado', rotulo: 'Guias dos exames ao inspecionado', valor: 1 },
    ]);
  });
  it('série de 28 dias: [e-mails, guias]', () => {
    expect(r.envios28).toHaveLength(28);
    expect(r.envios28[27].valores).toEqual([3, 3]);
    expect(r.envios28.find(p => p.chave === '2026-11-03')?.valores).toEqual([5, 1]);
  });
  it('CSV por dia do período, em ordem de data', () => {
    expect(enviosPorDia(docs, MES, ['resultadoIS', 'aberturaIS'])).toEqual([
      ['2026-11-03', 5, 4, 1, 1],
      ['2026-11-14', 3, 0, 2, 3],
    ]);
  });
  it('rótulo de tipo desconhecido cai na própria chave', () => {
    expect(rotuloTipoEmail('agendamentoBeneficios')).toBe('Agendamento de IS (Benefícios)');
    expect(rotuloTipoEmail('xpto')).toBe('xpto');
  });
});
