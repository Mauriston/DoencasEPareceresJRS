import { describe, it, expect, vi } from 'vitest';
vi.mock('../../services/firestorePermissions', () => ({ salvarPermissoesRemoto: vi.fn() }));
import { destinosBarraInferior } from '../barraInferior';

const views = (perfil: string, concursoEmAndamento: boolean, viewAtual?: any) =>
  destinosBarraInferior(perfil, { concursoEmAndamento, viewAtual }).map(d => d.view);

describe('barra inferior — página aberta por fora da barra', () => {
  it('entra como último destino enquanto o usuário está nela, e some ao sair', () => {
    expect(views('admin', true, 'dgpm406')).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor', 'dgpm406']);
    expect(views('admin', true, 'dgpm406-anexos')).toContain('dgpm406');
    expect(views('admin', true, 'home')).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
  });
  it('não duplica destino que já está na barra', () => {
    expect(views('admin', true, 'inspecoes').filter(v => v === 'inspecoes')).toHaveLength(1);
  });
});

describe('barra inferior (4e) — destinos por perfil', () => {
  it('Admin/Médicos: Início · Inspeções · Concursos · Perícias', () => {
    expect(views('admin', true)).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
    expect(views('user_medicos', true)).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
  });
  it('sem concurso em andamento, Concursos sai e nada entra no lugar', () => {
    expect(views('admin', false)).toEqual(['home', 'inspecoes', 'pericia-menor']);
  });
  it('em /concursos o item aparece mesmo sem concurso em andamento', () => {
    expect(views('admin', false, 'concursosJRS')).toEqual(['home', 'inspecoes', 'concursosJRS', 'pericia-menor']);
  });
  it('Secretaria: o lugar de Perícias é de Exames (Exames mínimos)', () => {
    expect(views('user_secretaria', true)).toEqual(['home', 'inspecoes', 'concursosJRS', 'exames']);
    expect(views('user_secretaria', false)).toEqual(['home', 'inspecoes', 'exames']);
    expect(destinosBarraInferior('user_secretaria', { concursoEmAndamento: false }).find(x => x.view === 'exames')).toMatchObject({ rotulo: 'Exames', ariaLabel: 'Exames mínimos' });
  });
  it('Médicos Geral: Início · Atestados · Escala (3ª posição) · Exames', () => {
    const d = destinosBarraInferior('user_medicos_geral', { concursoEmAndamento: true });
    expect(d.map(x => x.view)).toEqual(['home', 'pericia-menor', 'escala', 'exames']);
    expect(d[1].rotulo).toBe('Atestados');
    expect(d[2]).toMatchObject({ rotulo: 'Escala', ariaLabel: 'Escala de Serviço' });
  });
  it('só o Médicos Geral recebe a Escala na barra', () => {
    expect(views('admin', true)).not.toContain('escala');
    expect(views('user_medicos', true)).not.toContain('escala');
  });
  it('o rótulo de Inspeções é "Inspeções" (não "IS") e o aria-label segue completo', () => {
    const d = destinosBarraInferior('admin', { concursoEmAndamento: false });
    expect(d.find(x => x.view === 'inspecoes')).toMatchObject({ rotulo: 'Inspeções', ariaLabel: 'Inspeções de Saúde' });
  });
  it('Inspecionado só aparece enquanto o usuário está na página dos inspecionados, antes do Menu', () => {
    expect(views('admin', false)).not.toContain('militares');
    expect(views('admin', false, 'militares')).toEqual(['home', 'inspecoes', 'pericia-menor', 'militares']);
    const d = destinosBarraInferior('admin', { concursoEmAndamento: false, viewAtual: 'militares' });
    expect(d[d.length - 1]).toMatchObject({ view: 'militares', rotulo: 'Inspecionado', ariaLabel: 'Inspecionados' });
  });
  it('rótulos curtos (≤ 12) e Perícias com aria-label completo', () => {
    const d = destinosBarraInferior('user_medicos', { concursoEmAndamento: true, viewAtual: 'militares' });
    d.forEach(x => expect(x.rotulo.length).toBeLessThanOrEqual(12));
    expect(d.find(x => x.view === 'pericia-menor')).toMatchObject({ rotulo: 'Perícias', ariaLabel: 'Perícias Menores' });
  });
});
