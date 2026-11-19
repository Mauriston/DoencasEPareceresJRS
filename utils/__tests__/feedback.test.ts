import { describe, expect, it, vi } from 'vitest';
import { dataHoraRecife, erroFeedback, feedbackConcluido, paragrafosAgradecimento, rotuloImpacto } from '../feedback';
import { atualizarFeedback, criarFeedback, montarEmailFeedback, REMETENTE_FEEDBACK } from '../../servidor/feedback/feedback';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'TS', delete: () => 'DEL' },
}));

describe('regras do feedback', () => {
  it('valida tipo, página/impacto do problema e tamanho da mensagem', () => {
    expect(erroFeedback({})).toMatch(/tipo/);
    expect(erroFeedback({ tipo: 'problema', mensagem: 'x'.repeat(20) })).toMatch(/página/);
    expect(erroFeedback({ tipo: 'problema', pagina: 'inspecoes', mensagem: 'x'.repeat(20) })).toMatch(/impacto/);
    expect(erroFeedback({ tipo: 'sugestao', mensagem: 'curta' })).toMatch(/10 caracteres/);
    expect(erroFeedback({ tipo: 'elogio', mensagem: 'Muito bom o app!' })).toBe('');
    expect(erroFeedback({ tipo: 'problema', pagina: 'inspecoes', impacto: 'alto', mensagem: 'Não salva a IS.' })).toBe('');
  });
  it('formata a data/hora no fuso de Recife', () => {
    expect(dataHoraRecife(new Date('2026-11-19T17:05:00Z'))).toBe('19/11/2026 às 14:05');
  });
  it('concluído: problema → solucionado; demais → lido', () => {
    expect(feedbackConcluido({ tipo: 'problema', lido: true })).toBe(false);
    expect(feedbackConcluido({ tipo: 'problema', solucionado: true })).toBe(true);
    expect(feedbackConcluido({ tipo: 'elogio', lido: true })).toBe(true);
    expect(rotuloImpacto('medio')).toBe('Médio');
  });
  it('o agradecimento do problema avisa que será informado na solução', () => {
    expect(paragrafosAgradecimento('problema').join(' ')).toMatch(/será informado/);
    expect(paragrafosAgradecimento('elogio')).toHaveLength(1);
  });
});

describe('e-mail do feedback', () => {
  it('vocativo, relato escapado e só a assinatura do Presidente', () => {
    const { html, texto } = montarEmailFeedback({
      nome: 'Fulano', titulo: 'T', paragrafos: ['Obrigado.'],
      relato: { pagina: 'Inspeções', registradoEm: '19/11/2026 às 14:05', texto: '<b>erro</b>' },
      presidente: { nome: 'PRESIDENTE X', posto: 'CT (Md)' },
    });
    expect(html).toContain('Prezado Fulano,');
    expect(html).toContain('&lt;b&gt;erro&lt;/b&gt;');
    expect(html).toContain('PRESIDENTE X');
    expect(html).not.toContain('Por ordem de');
    expect(texto).toContain('Registrado em: 19/11/2026 às 14:05');
  });
});

/** Firestore mínimo em memória. */
const fakeDb = (docs: Record<string, Record<string, unknown>>) => {
  let n = 0;
  const ref = (col: string, id: string) => ({
    id,
    get: async () => ({ exists: !!docs[`${col}/${id}`], data: () => docs[`${col}/${id}`] }),
    set: async (d: Record<string, unknown>) => { docs[`${col}/${id}`] = { ...d }; },
    update: async (d: Record<string, unknown>) => { docs[`${col}/${id}`] = { ...docs[`${col}/${id}`], ...d }; },
  });
  return {
    docs,
    collection: (col: string) => ({ doc: (id?: string) => ref(col, id ?? `novo${++n}`) }),
  } as never;
};

describe('servidor do feedback', () => {
  it('registra e envia o agradecimento ao e-mail do usuário', async () => {
    const docs: Record<string, Record<string, unknown>> = { 'usuarios/u1': { usuario: 'CT Fulano', email: 'f@mb.br' } };
    const enviar = vi.fn(async () => {});
    const r = await criarFeedback(fakeDb(docs), { tipo: 'problema', pagina: 'inspecoes', paginaRotulo: 'Inspeções', impacto: 'alto', mensagem: 'A IS não salva.' }, { uid: 'u1', perfil: 'user_medicos' }, enviar);
    expect(r.emailEnviado).toBe(true);
    expect(docs['feedbacks/novo1']).toMatchObject({ tipo: 'problema', paginaRotulo: 'Inspeções', usuario: 'CT Fulano', solucionado: false });
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ para: 'f@mb.br', nomeRemetente: REMETENTE_FEEDBACK }));
  });
  it('recusa feedback inválido', async () => {
    await expect(criarFeedback(fakeDb({}), { tipo: 'elogio', mensagem: 'oi' }, { uid: 'u1', perfil: 'user_medicos' }, vi.fn())).rejects.toThrow(/10 caracteres/);
  });
  it('só o Admin marca; solucionar um problema envia o e-mail uma vez', async () => {
    const docs: Record<string, Record<string, unknown>> = {
      'usuarios/u1': { usuario: 'CT Fulano', email: 'f@mb.br' },
      'feedbacks/f1': { tipo: 'problema', mensagem: 'A IS não salva.', paginaRotulo: 'Inspeções', uid: 'u1', criadoEmTexto: '19/11/2026 às 14:05' },
    };
    const db = fakeDb(docs);
    const enviar = vi.fn(async () => {});
    await expect(atualizarFeedback(db, { id: 'f1', marcado: true }, { uid: 'u1', perfil: 'user_medicos' }, enviar)).rejects.toThrow(/Admin/);
    const r = await atualizarFeedback(db, { id: 'f1', marcado: true }, { uid: 'a', perfil: 'admin' }, enviar);
    expect(r.emailEnviado).toBe(true);
    expect(docs['feedbacks/f1'].solucionado).toBe(true);
    const html = (enviar.mock.calls[0] as unknown as [{ html: string }])[0].html;
    expect(html).toContain('A IS não salva.');
    expect(html).toContain('Inspeções');
    expect(html).toContain('19/11/2026 às 14:05');
    const r2 = await atualizarFeedback(db, { id: 'f1', marcado: true }, { uid: 'a', perfil: 'admin' }, enviar);
    expect(r2.emailEnviado).toBe(false);
    expect(enviar).toHaveBeenCalledTimes(1);
  });
  it('marcar sugestão como lida não envia e-mail', async () => {
    const docs: Record<string, Record<string, unknown>> = { 'feedbacks/f2': { tipo: 'sugestao', mensagem: 'Uma ideia boa.' } };
    const enviar = vi.fn();
    await atualizarFeedback(fakeDb(docs), { id: 'f2', marcado: true }, { uid: 'a', perfil: 'admin' }, enviar);
    expect(docs['feedbacks/f2'].lido).toBe(true);
    expect(enviar).not.toHaveBeenCalled();
  });
});
