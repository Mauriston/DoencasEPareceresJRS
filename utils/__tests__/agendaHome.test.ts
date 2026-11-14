// Card "Agenda de inspeções" (utils/agendaHome.ts) da Início.
import { describe, it, expect } from 'vitest';
import { eventosDoDia, marcasDoDia, type ISAgenda } from '../agendaHome';

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
