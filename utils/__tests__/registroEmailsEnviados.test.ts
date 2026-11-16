// Servidor: registrarEmailIS grava o conteúdo uma vez (emails_enviados + conteudo/corpo) e o histórico de cada IS
// com o conteudoId; registrarEmailEnviado liga ao NIP. Firestore em memória (só o que os registros usam).
import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => ({ inc: n }) } }));
import { registrarEmailEnviado, registrarEmailIS } from '../../servidor/email/registroEmailsIS';

const fakeDb = (inicial: Record<string, Record<string, unknown>> = {}) => {
  const docs = new Map<string, Record<string, unknown>>(Object.entries(inicial));
  let seq = 0;
  const docRef = (caminho: string): any => ({
    id: caminho.split('/').pop(),
    path: caminho,
    get: async () => ({ exists: docs.has(caminho), data: () => docs.get(caminho) }),
    set: async (d: Record<string, unknown>) => { docs.set(caminho, d); },
    collection: (n: string) => colRef(`${caminho}/${n}`),
  });
  const colRef = (caminho: string): any => ({
    doc: (id?: string) => docRef(`${caminho}/${id ?? `auto${++seq}`}`),
    add: async (d: Record<string, unknown>) => { const r = docRef(`${caminho}/auto${++seq}`); docs.set(r.path, d); return r; },
  });
  const db: any = {
    collection: (n: string) => colRef(n),
    getAll: async (...refs: any[]) => Promise.all(refs.map(r => r.get())),
    batch: () => {
      const ops: [string, Record<string, unknown>][] = [];
      return { set: (r: any, d: Record<string, unknown>) => { ops.push([r.path, d]); }, commit: async () => { ops.forEach(([p, d]) => docs.set(p, d)); } };
    },
  };
  const em = (prefixo: string) => [...docs.entries()].filter(([k]) => k.startsWith(prefixo));
  return { db, docs, em };
};

describe('registrarEmailIS', () => {
  it('lote: um conteúdo, ligado às IS e aos NIPs, e um registro por IS com o conteudoId', async () => {
    const { db, em } = fakeDb({
      'inspecoes/10': { inspecionadoId: '12345678' },
      'inspecoes/11': { inspecionadoId: '87654321' },
      'usuarios/u1': { usuario: 'sec.fulana', nome: 'Fulana' },
    });
    await registrarEmailIS(db, ['10', '11'], 'u1', {
      tipo: 'nac', assunto: 'NAC', para: ['nac@x'], cc: [], html: '<p>Lista</p><script>x</script>', texto: 'Lista', anexo: 'NAC.pdf',
    });
    const enviados = em('emails_enviados/').filter(([k]) => k.split('/').length === 2);
    expect(enviados).toHaveLength(1);
    const [caminho, doc] = enviados[0];
    expect(doc).toMatchObject({
      tipo: 'nac', nips: ['12345678', '87654321'], isIds: ['10', '11'], anexo: 'NAC.pdf', temConteudo: true,
      enviadoPor: { uid: 'u1', usuario: 'sec.fulana', nome: 'Fulana' },
    });
    expect(em(`${caminho}/conteudo/corpo`)[0][1]).toEqual({ html: '<p>Lista</p>', texto: 'Lista' });
    const id = caminho.split('/')[1];
    expect(em('inspecoes/10/emails/')[0][1]).toMatchObject({ tipo: 'nac', conteudoId: id });
    expect(em('inspecoes/11/emails/')[0][1]).toMatchObject({ tipo: 'nac', conteudoId: id });
    // Contagem no uso do app: uma por IS.
    expect(em('uso_diario/')[0][1]).toMatchObject({ emailsPorTipo: { nac: { inc: 1 } } });
  });

  it('sem conteúdo, nada em conteudo/corpo; contarUso false não conta', async () => {
    const { db, em } = fakeDb({ 'inspecoes/10': { inspecionadoId: '12345678' } });
    await registrarEmailIS(db, '10', null, { tipo: 'agendaIS', assunto: 'IS AGENDADAS', para: ['jrs@x'] }, { contarUso: false });
    expect(em('emails_enviados/').filter(([k]) => k.includes('/conteudo/'))).toHaveLength(0);
    expect(em('emails_enviados/')[0][1]).toMatchObject({ temConteudo: false, enviadoPor: { uid: 'automatico', usuario: 'Automático' } });
    expect(em('uso_diario/')).toHaveLength(0);
  });

  it('falha na gravação não lança', async () => {
    const db: any = { collection: () => { throw new Error('x'); }, getAll: async () => { throw new Error('x'); } };
    await expect(registrarEmailIS(db, '10', null, { tipo: 'nac', assunto: 'A', para: [] }, { contarUso: false })).resolves.toBeUndefined();
  });
});

describe('registrarEmailEnviado', () => {
  it('ligado só ao NIP (fora das IS)', async () => {
    const { db, em } = fakeDb();
    const id = await registrarEmailEnviado(db, null, { tipo: 'impressaoParecer', assunto: 'POR FAVOR, IMPRIMIR', para: ['g@x'], html: '<p>a</p>' }, { nips: ['12.3456.78'] });
    expect(id).toBeTruthy();
    expect(em(`emails_enviados/${id}`)[0][1]).toMatchObject({ nips: ['12345678'], isIds: [], tipo: 'impressaoParecer' });
  });
});
