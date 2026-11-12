// Card "Agenda de inspeções" (utils/agendaHome.ts) e "Acesso rápido" (utils/acessoRapido.ts) da Início.
import { describe, it, expect } from 'vitest';
import { eventosDoDia, marcasDoDia, type ISAgenda } from '../agendaHome';
import { resolverAcessoRapido, contarAcessos, diasForaDaJanela, inicioDaQuinzena, lerEscolha } from '../acessoRapido';

const is = (id: string, hora: string, extra: Partial<ISAgenda> = {}): ISAgenda => ({
  id, is: Number(id), inspecionado: `CT (Md) 12.3456.78 FULANO ${id}`, dataEntrevista: `2026-11-12T${hora}`, status: 'agendada',
  situacao: 'andamento', dataAbertura: '2026-11-01', finalidade: 'Verificação de Incapacidade', grupoFinalidade: 'Verificações e Términos', amp: 'JRS', ...extra,
});

describe('agenda da Início', () => {
  const concurso = { chave: 'c1|2026-11-12', concursoId: 'c1', nome: 'CPAEAM/2026', data: '2026-11-12', total: 12, encerrado: false };

  it('concurso da agenda própria vira um evento único, com nome e candidatos, e as IS seguem por hora', () => {
    const ev = eventosDoDia('2026-11-12', [is('2', '10:00'), is('1', '08:00'), is('3', '08:00', { status: 'cancelada' })], [concurso], '2026-11-12');
    expect(ev.map(e => e.tipo)).toEqual(['concurso', 'is', 'is']);
    expect(ev[0]).toMatchObject({ titulo: 'CPAEAM/2026', hora: '07:30', concursoId: 'c1' });
    expect(ev[0].detalhe).toMatch(/12 candidatos/);
    expect(ev[1].titulo).toBe('FULANO 1');
  });

  it('um evento para cada concurso do dia; IS de concurso cadastradas não se repetem', () => {
    const outro = { ...concurso, chave: 'c2|2026-11-12', concursoId: 'c2', nome: 'EAM/2026', total: 1 };
    const isConcurso = is('9', '08:00', { finalidade: 'Concurso CPAEAM', grupoFinalidade: 'Concursos' });
    const ev = eventosDoDia('2026-11-12', [isConcurso], [concurso, outro], '2026-11-12');
    expect(ev.map(e => e.titulo)).toEqual(['CPAEAM/2026', 'EAM/2026']);
    expect(ev[1].detalhe).toMatch(/1 candidato ·/);
  });

  it('sem agenda de concursos: IS de concurso agrupadas por concurso e turno', () => {
    const l = [
      is('1', '08:00', { finalidade: 'CPAEAM', grupoFinalidade: 'Concursos' }),
      is('2', '09:30', { finalidade: 'CPAEAM', grupoFinalidade: 'Concursos' }),
      is('3', '13:00', { finalidade: 'CPAEAM', grupoFinalidade: 'Concursos' }),
    ];
    const ev = eventosDoDia('2026-11-12', l, [], '2026-11-12');
    expect(ev).toHaveLength(2);
    expect(ev[0]).toMatchObject({ titulo: 'CPAEAM', hora: '08:00' });
    expect(ev[0].detalhe).toMatch(/2 candidatos · manhã/);
    expect(ev[1].detalhe).toMatch(/· tarde/);
  });

  it('marcas do dia', () => {
    expect(marcasDoDia('2026-11-12', [is('1', '08:00'), is('2', '09:00', { amp: 'MPI' })], [concurso])).toEqual({ jrs: true, mpi: true, concurso: true, concursoConcluido: false });
    expect(marcasDoDia('2026-11-13', [is('1', '08:00')], [])).toEqual({ jrs: false, mpi: false, concurso: false, concursoConcluido: false });
  });
});

describe('acesso rápido', () => {
  const muitas = ['guide', 'exames', 'dgpm406', 'concursosJRS', 'concursos', 'pareceres', 'inspecoes', 'escala', 'ferias'] as any[];
  const padrao = ['guide', 'exames', 'dgpm406', 'concursosJRS', 'concursos'] as any[];

  it('Inspeções de Saúde nunca entra, nem escolhida pelo usuário', () => {
    const r = resolverAcessoRapido({ salvo: { ids: ['inspecoes', 'guide'] as any, semana: '2026-11-09' }, disponiveis: muitas, contagem: {}, hoje: '2026-11-12', padrao });
    expect(r.ids).toEqual(['guide']);
    expect(resolverAcessoRapido({ salvo: null, disponiveis: ['inspecoes', 'guide'] as any, contagem: {}, hoje: '2026-11-12', padrao }).ids).toEqual(['guide']);
  });

  it('renova uma vez por quinzena pelas mais acessadas (mais de 6 páginas)', () => {
    const contagem = { escala: 9, ferias: 5, inspecoes: 50, guide: 1 } as any;
    const r = resolverAcessoRapido({ salvo: { ids: padrao, semana: '2026-11-02' }, disponiveis: muitas, contagem, hoje: '2026-11-12', padrao });
    expect(r.ids.slice(0, 3)).toEqual(['escala', 'ferias', 'guide']);
    expect(r.ids).toHaveLength(6);
    expect(r.salvar?.semana).toBe('2026-11-09');
    // Na mesma quinzena (ou depois de editar), vale a escolha guardada; também na 2ª semana da quinzena.
    const r2 = resolverAcessoRapido({ salvo: { ids: ['pareceres'] as any, semana: '2026-11-09' }, disponiveis: muitas, contagem, hoje: '2026-11-12', padrao });
    expect(r2).toEqual({ ids: ['pareceres'] });
    const r3 = resolverAcessoRapido({ salvo: { ids: ['pareceres'] as any, semana: '2026-11-09' }, disponiveis: muitas, contagem, hoje: '2026-11-20', padrao });
    expect(r3).toEqual({ ids: ['pareceres'] });
    const r4 = resolverAcessoRapido({ salvo: { ids: ['pareceres'] as any, semana: '2026-11-09' }, disponiveis: muitas, contagem, hoje: '2026-11-23', padrao });
    expect(r4.salvar?.semana).toBe('2026-11-23');
  });

  it('com 6 páginas ou menos não renova', () => {
    const poucas = ['guide', 'exames', 'pareceres', 'inspecoes'] as any[];
    const r = resolverAcessoRapido({ salvo: null, disponiveis: poucas, contagem: { pareceres: 9 } as any, hoje: '2026-11-12', padrao });
    expect(r.salvar).toBeUndefined();
    expect(r.ids).toEqual(['guide', 'exames', 'pareceres']);
  });

  it('quinzenas de 14 dias começando na segunda-feira', () => {
    expect(inicioDaQuinzena('2026-11-09')).toBe('2026-11-09');
    expect(inicioDaQuinzena('2026-11-22')).toBe('2026-11-09');
    expect(inicioDaQuinzena('2026-11-23')).toBe('2026-11-23');
    expect(inicioDaQuinzena('2026-01-05')).toBe('2026-01-05');
    expect(inicioDaQuinzena('2025-12-31')).toBe('2025-12-22');
  });

  it('conta os acessos dos últimos 28 dias e lê o formato antigo', () => {
    const a = { '2026-10-01': { guide: 7 }, '2026-11-12': { pareceres: 2 }, '2026-10-20': { guide: 1 } } as any;
    expect(contarAcessos(a, '2026-11-12')).toEqual({ pareceres: 2, guide: 1 });
    expect(diasForaDaJanela(a, '2026-11-12')).toEqual(['2026-10-01']);
    expect(lerEscolha('["guide"]')).toEqual({ ids: ['guide'], semana: '' });
    expect(lerEscolha('lixo')).toBeNull();
  });
});
