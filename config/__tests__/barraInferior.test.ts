import { describe, it, expect, vi } from 'vitest';
vi.mock('../../services/firestorePermissions', () => ({ salvarPermissoesRemoto: vi.fn() }));
import { destinosBarraInferior } from '../barraInferior';

const views = (perfil: string, concursoEmAndamento: boolean, viewAtual?: any) =>
  destinosBarraInferior(perfil, { concursoEmAndamento, viewAtual }).map(d => d.view);

describe('barra inferior (4e) — destinos por perfil', () => {
  it('Admin/Médicos: Início · IS · Concursos · Perícias', () => {
    expect(views('admin', true)).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
    expect(views('user_medicos', true)).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
  });
  it('sem concurso em andamento, Concursos sai e nada entra no lugar', () => {
    expect(views('admin', false)).toEqual(['home', 'inspecoes', 'pericia-menor']);
  });
  it('em /concursos o item aparece mesmo sem concurso em andamento', () => {
    expect(views('admin', false, 'concursosJRS')).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
  });
  it('Secretaria (sem Perícia Menor e sem Mensagens liberada): Início · IS · Concursos', () => {
    expect(views('user_secretaria', true)).toEqual(['home', 'inspecoes', 'concursosJRS']);
    expect(views('user_secretaria', false)).toEqual(['home', 'inspecoes']);
  });
  it('Médicos Geral: Início · Atestados · Exames', () => {
    const d = destinosBarraInferior('user_medicos_geral', { concursoEmAndamento: true });
    expect(d.map(x => x.view)).toEqual(['home', 'pericia-menor', 'exames']);
    expect(d[1].rotulo).toBe('Atestados');
  });
  it('rótulos curtos (≤ 10) e Perícias com aria-label completo', () => {
    const d = destinosBarraInferior('user_medicos', { concursoEmAndamento: true });
    d.forEach(x => expect(x.rotulo.length).toBeLessThanOrEqual(10));
    expect(d.find(x => x.view === 'pericia-menor')).toMatchObject({ rotulo: 'Perícias', ariaLabel: 'Perícias Menores' });
  });
});
