import { describe, it, expect } from 'vitest';
import {
  janelaDoPeriodo, variacao, aplicarRecorteIS, recorteInicialIS, resumoIS, faltasNoIntervalo, serieMensalIS,
  emCursoPorEtapa, porPerito, aplicarRecortePericias, resumoPericias, serieMensalPericias, cidsFrequentes,
  resumoConcursos, andamentoPorConcurso, dataDoCandidato, causasInaptidao, cidDaInaptidao, capituloDoCid, resumoUso, ultimosMeses, inicioDaLeitura,
  type ISPainel, type PericiaPainel, type ConcursoPainel, type UsoDia,
} from '../painel';

const HOJE = '2026-11-14';

const is = (p: Partial<ISPainel>): ISPainel => ({
  id: Math.random().toString(36).slice(2), dataAbertura: '2026-11-01', dataEntrevista: '', dataFinalizacao: '',
  status: 'aberta', situacao: 'aberta', finalidade: 'LTS', grupoFinalidade: 'Saúde', peritoUid: 'p1', peritoNome: 'CT A', amp: 'JRS', ...p,
});

describe('janelaDoPeriodo', () => {
  it('Mês: do dia 1º a hoje, contra o mês anterior até o mesmo dia', () => {
    const j = janelaDoPeriodo('mes', HOJE);
    expect(j.atual).toEqual({ inicio: '2026-11-01', fim: HOJE });
    expect(j.anterior).toEqual({ inicio: '2026-10-01', fim: '2026-10-14' });
    expect(j.rotulo).toBe('nov 2026');
    expect(j.rotuloAnterior).toBe('out');
  });
  it('3 meses: set–nov contra jun–ago', () => {
    const j = janelaDoPeriodo('3m', HOJE);
    expect(j.atual.inicio).toBe('2026-09-01');
    expect(j.anterior).toEqual({ inicio: '2026-06-01', fim: '2026-08-14' });
    expect(j.rotulo).toBe('set–nov 2026');
    expect(j.rotuloAnterior).toBe('jun–ago');
  });
  it('12 meses atravessa o ano', () => {
    const j = janelaDoPeriodo('12m', HOJE);
    expect(j.atual.inicio).toBe('2025-12-01');
    expect(j.anterior).toEqual({ inicio: '2024-12-01', fim: '2025-11-14' });
    expect(j.rotulo).toBe('dez 2025–nov 2026');
  });
  it('Ano: até o mesmo dia do ano anterior; limita o dia ao fim do mês', () => {
    expect(janelaDoPeriodo('ano', HOJE).anterior).toEqual({ inicio: '2025-01-01', fim: '2025-11-14' });
    expect(janelaDoPeriodo('mes', '2026-03-31').anterior.fim).toBe('2026-02-28');
  });
  it('início da leitura cobre o período anterior e os 12 meses da série', () => {
    expect(inicioDaLeitura(janelaDoPeriodo('mes', HOJE), HOJE)).toBe('2025-11-14');
    expect(inicioDaLeitura(janelaDoPeriodo('12m', HOJE), HOJE)).toBe('2024-12-01');
    expect(ultimosMeses(HOJE, 3)).toEqual(['2026-09', '2026-10', '2026-11']);
  });
});

describe('variacao', () => {
  it('percentual com sentido', () => {
    expect(variacao(112, 100, 'pct', 'maior-melhor')).toEqual({ direcao: 'sobe', texto: '12%', tom: 'bom' });
    expect(variacao(112, 100, 'pct', 'menor-melhor')?.tom).toBe('ruim');
    expect(variacao(90, 100, 'pct', 'menor-melhor')).toEqual({ direcao: 'desce', texto: '10%', tom: 'bom' });
  });
  it('neutro nunca ganha cor; igual é neutro', () => {
    expect(variacao(120, 100)?.tom).toBe('neutro');
    expect(variacao(100, 100, 'pct', 'maior-melhor')).toEqual({ direcao: 'igual', texto: '0%', tom: 'neutro' });
  });
  it('sem base: anterior 0 ou valor ausente', () => {
    expect(variacao(5, 0)).toBeNull();
    expect(variacao(0, 0)?.direcao).toBe('igual');
    expect(variacao(null, 3)).toBeNull();
  });
  it('absoluto e pontos percentuais', () => {
    expect(variacao(23, 27, 'abs', 'menor-melhor', 'dias')).toEqual({ direcao: 'desce', texto: '4 dias', tom: 'bom' });
    expect(variacao(6.1, 6.9, 'pp', 'menor-melhor')).toEqual({ direcao: 'desce', texto: '0,8 p.p.', tom: 'bom' });
  });
});

describe('Inspeções', () => {
  const lista = [
    is({ peritoUid: 'eu', amp: 'JRS', dataAbertura: '2026-11-02' }),
    is({ peritoUid: 'outro', amp: 'MPI', dataAbertura: '2026-10-05' }),
    is({ peritoUid: 'eu', amp: 'JRS', dataAbertura: '2026-10-01', status: 'tis_assinado', situacao: 'finalizada', dataFinalizacao: '2026-11-05', dataEntrevista: '2026-10-20T08:00' }),
    is({ peritoUid: 'outro', amp: 'MPI', dataAbertura: '2026-09-01', status: 'tis_assinado', situacao: 'finalizada', dataFinalizacao: '2026-10-11' }),
    is({ dataAbertura: '2026-09-01' }), // atrasada há > 30 dias
  ];
  it('recortes', () => {
    expect(recorteInicialIS('user_medicos')).toBe('minhas');
    expect(recorteInicialIS('user_medicos_mpi')).toBe('mpi');
    expect(recorteInicialIS('user_secretaria')).toBe('todas');
    expect(aplicarRecorteIS(lista, 'minhas', 'eu')).toHaveLength(2);
    expect(aplicarRecorteIS(lista, 'mpi', 'eu')).toHaveLength(2);
    expect(aplicarRecorteIS(lista, 'todas', 'eu')).toHaveLength(5);
  });
  it('resumo do mês contra o mês anterior', () => {
    const r = resumoIS(lista, janelaDoPeriodo('mes', HOJE), HOJE);
    expect(r.abertas).toEqual({ atual: 1, anterior: 2 });
    expect(r.finalizadas).toEqual({ atual: 1, anterior: 1 });
    expect(r.tempoMedio).toEqual({ atual: 35, anterior: 40 });
    expect(r.atrasadas).toBe(3);
    expect(r.atrasadas30).toBe(2);
  });
  it('faltas contam a comunicação ao HNRe mesmo depois de reagendada', () => {
    const j = { inicio: '2026-11-01', fim: '2026-11-30' };
    const f = faltasNoIntervalo([
      is({ status: 'faltou', dataEntrevista: '2026-11-03T08:00' }),
      is({ status: 'reagendada', dataEntrevista: '2026-12-01T08:00', emailFaltaDataEntrevista: '2026-11-04T08:00' }),
      is({ status: 'agendada', dataEntrevista: '2026-11-10T08:00' }),
      is({ status: 'cancelada', dataEntrevista: '2026-11-11T08:00' }),
    ], j);
    expect(f).toEqual({ faltas: 2, agendadas: 3 });
  });
  it('série mensal, etapas em curso e por perito', () => {
    const s = serieMensalIS(lista, HOJE);
    expect(s).toHaveLength(12);
    expect(s[11]).toMatchObject({ chave: '2026-11', valores: [1, 1] });
    const etapas = emCursoPorEtapa(lista, HOJE);
    expect(etapas.find(e => e.chave === 'atrasada')).toMatchObject({ valor: 3, alerta: true });
    const peritos = porPerito(lista, janelaDoPeriodo('3m', HOJE));
    expect(peritos.find(p => p.uid === 'eu')).toMatchObject({ realizadas: 1, tempoMedio: 35 });
  });
});

describe('Perícias Menores', () => {
  const p = (x: Partial<PericiaPainel>): PericiaPainel => ({
    id: Math.random().toString(36).slice(2), militarId: 'm1', inspecionado: 'X', om: 'EAMPE', cid: 'M545 - Lombalgia', dispensas: ['TODAS AS ATIVIDADES'],
    dataAtestado: '2026-11-03', dataTermino: '2026-11-05', tempoHomologado: 3, peritoUid: 'eu', ...x,
  });
  const lista = [
    p({}),
    p({ dataAtestado: '2026-10-02', dataTermino: '2026-10-21', tempoHomologado: 20, dispensas: ['ESFORÇO FÍSICO'], peritoUid: 'outro', homologacao: true }),
    p({ dataAtestado: '2026-11-10', dataTermino: '2026-11-16', tempoHomologado: 7, om: 'HNRe', cid: 'J069 - IVAS', criadoPor: 'eu', peritoUid: 'adm' }),
    p({ militarId: 'm2', dataAtestado: '2026-11-12', dataTermino: '2026-11-13', tempoHomologado: 2 }),
  ];
  it('recorte "minhas": só as que têm o usuário como perito responsável (registrar não conta)', () => {
    expect(aplicarRecortePericias(lista, 'minhas', 'eu')).toHaveLength(2);
  });
  it('resumo', () => {
    const r = resumoPericias(lista, janelaDoPeriodo('mes', HOJE), HOJE);
    expect(r.pericias).toEqual({ atual: 3, anterior: 1 });
    expect(r.dias).toEqual({ atual: 12, anterior: 20, media: 4 });
    expect(r.vigentes).toBe(1);
    expect(r.pertoDoLimite).toBe(1); // m1: 3 + 20 + 7 = 30 dias
    expect(r.recorrentes).toBe(1);
    expect(r.homologacoes).toEqual({ atual: 0, anterior: 100 });
  });
  it('série (dispensa total × restrições) e CID', () => {
    const s = serieMensalPericias(lista, HOJE);
    expect(s[11].valores).toEqual([3, 0]);
    expect(s[10].valores).toEqual([0, 1]);
    expect(cidsFrequentes(lista, janelaDoPeriodo('mes', HOJE))[0]).toMatchObject({ chave: 'M545', rotulo: 'M545 Lombalgia', valor: 2 });
  });
  it('CID no formato DESCRABREV agrupa com o formato antigo pelo código', () => {
    const descrabrev = lista.map(p => (p.cid?.startsWith('M545') ? { ...p, cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545' } : p));
    const misto = [...lista, ...descrabrev.filter(p => p.cid === 'M54.5 Dor lombar baixa')];
    const [primeiro] = cidsFrequentes(misto, janelaDoPeriodo('mes', HOJE));
    expect(primeiro.chave).toBe('M545');
    expect(primeiro.valor).toBeGreaterThan(2);
    const [so] = cidsFrequentes(descrabrev, janelaDoPeriodo('mes', HOJE));
    expect(so).toMatchObject({ chave: 'M545', rotulo: 'M54.5 Dor lombar baixa', valor: 2 });
  });
});

describe('Concursos', () => {
  const c: ConcursoPainel[] = [
    { id: 'a', nome: 'CP-A', status: 'em_andamento', totalCandidatos: 10, candidatos: [
      { status: 'APTO', finalizado: true, dataLaudo: '05/11/2026', dataAgendamento: '2026-11-05' },
      { status: 'INAPTO', finalizado: true, dataLaudo: '', dataAgendamento: '2026-11-06', observacoes: 'M54.5 Dor lombar baixa' },
      { status: 'FALTOU', finalizado: true, dataLaudo: '', dataAgendamento: '2026-10-06' },
      { status: '', finalizado: false, dataLaudo: '', dataAgendamento: '2026-11-20' },
    ] },
    { id: 'b', nome: 'CP-B', status: 'encerrado', totalCandidatos: 2, candidatos: [
      { status: 'INSUF DOCUMENTAL', finalizado: true, dataLaudo: '01/11/2026', dataAgendamento: '' },
    ] },
  ];
  it('data do candidato', () => {
    expect(dataDoCandidato({ dataLaudo: '05/11/2026', dataAgendamento: '2026-11-01' })).toBe('2026-11-05');
    expect(dataDoCandidato({ dataLaudo: '', dataAgendamento: '2026-11-01' })).toBe('2026-11-01');
  });
  it('resumo e andamento', () => {
    const r = resumoConcursos(c, janelaDoPeriodo('mes', HOJE));
    expect(r.emAndamento).toEqual([{ id: 'a', nome: 'CP-A' }]);
    expect(r.finalizados).toEqual({ atual: 3, anterior: 1 });
    expect(r.inaptos.atual).toBeCloseTo(33.3);
    expect(r.faltas).toEqual({ atual: 0, anterior: 100 });
    expect(andamentoPorConcurso(c)).toEqual([{ id: 'a', nome: 'CP-A', total: 10, finalizados: 3, aptos: 1, inaptos: 1, faltas: 1, idm: 0 }]);
  });
  it('lê o CID das observações do inapto', () => {
    expect(cidDaInaptidao('M54.5 Dor lombar baixa')).toEqual({ codigo: 'M54.5', rotulo: 'M54.5 Dor lombar baixa' });
    expect(cidDaInaptidao('m545 - Dor lombar baixa; reavaliar')).toEqual({ codigo: 'M54.5', rotulo: 'M54.5 Dor lombar baixa' });
    expect(cidDaInaptidao('H52 Transtornos da refração')).toEqual({ codigo: 'H52', rotulo: 'H52 Transtornos da refração' });
    expect(cidDaInaptidao('Z01.0')).toEqual({ codigo: 'Z01.0', rotulo: 'Z01.0' });
    expect(cidDaInaptidao('sem cid aqui')).toBeNull();
    expect(cidDaInaptidao('')).toBeNull();
    expect(capituloDoCid('M54.5')).toBe('Osteomuscular');
    expect(capituloDoCid('H52')).toBe('Olho e anexos');
    expect(capituloDoCid('H90')).toBe('Ouvido');
    expect(capituloDoCid('U07')).toBe('Outros');
  });
  it('causas de inaptidão por CID e por capítulo, só do período', () => {
    const cc: ConcursoPainel[] = [
      { id: 'a', nome: 'CP-A', status: 'em_andamento', totalCandidatos: 6, candidatos: [
        { status: 'INAPTO', finalizado: true, dataLaudo: '03/11/2026', dataAgendamento: '', observacoes: 'M54.5 Dor lombar baixa' },
        { status: 'INAPTO', finalizado: true, dataLaudo: '04/11/2026', dataAgendamento: '', observacoes: 'M545 Dor lombar baixa' },
        { status: 'INAPTO', finalizado: true, dataLaudo: '05/11/2026', dataAgendamento: '', observacoes: 'H52.1 Miopia' },
        { status: 'INAPTO', finalizado: true, dataLaudo: '06/11/2026', dataAgendamento: '', observacoes: 'motivo sem cid' },
        { status: 'INAPTO', finalizado: true, dataLaudo: '06/10/2026', dataAgendamento: '', observacoes: 'F32.0 Episódio depressivo leve' },
        { status: 'APTO', finalizado: true, dataLaudo: '06/11/2026', dataAgendamento: '', observacoes: 'J45 nunca contaria' },
      ] },
    ];
    const r = causasInaptidao(cc, janelaDoPeriodo('mes', HOJE));
    expect(r.inaptos).toBe(4);
    expect(r.comCid).toBe(3);
    expect(r.porCid).toEqual([
      { chave: 'M54.5', rotulo: 'M54.5 Dor lombar baixa', valor: 2 },
      { chave: 'H52.1', rotulo: 'H52.1 Miopia', valor: 1 },
    ]);
    expect(r.porCapitulo).toEqual([
      { chave: 'Osteomuscular', rotulo: 'Osteomuscular', valor: 2 },
      { chave: 'Olho e anexos', rotulo: 'Olho e anexos', valor: 1 },
    ]);
  });
});

describe('Uso do app', () => {
  const d = (dia: string, x: Partial<UsoDia>): UsoDia => ({ dia, paginas: {}, acessosPorUsuario: {}, acoesPorUsuario: {}, ultimo: {}, ...x });
  const docs = [
    d('2026-11-14', { paginas: { inspecoes: 6, home: 2 }, acessosPorUsuario: { u1: 5, u2: 3 }, acoesPorUsuario: { u1: { is_agendar: 2 }, u2: { email_enviar: 1 } }, ultimo: { u1: 200 } }),
    d('2026-11-02', { paginas: { home: 2 }, acessosPorUsuario: { u1: 2 }, ultimo: { u1: 100 } }),
    d('2026-10-03', { paginas: { home: 4 }, acessosPorUsuario: { u3: 4 }, acoesPorUsuario: { u3: { is_cadastrar: 1 } } }),
  ];
  const usuarios = [
    { uid: 'u1', usuario: 'CT A', perfil: 'admin', ativo: true },
    { uid: 'u2', usuario: 'SG B', perfil: 'user_secretaria', ativo: true },
    { uid: 'u3', usuario: 'CB C', perfil: 'user_secretaria', ativo: true },
    { uid: 'u4', usuario: 'CB D', perfil: 'user_medicos', ativo: true },
  ];
  it('KPIs do período contra o anterior', () => {
    const r = resumoUso(docs, usuarios, janelaDoPeriodo('mes', HOJE), HOJE);
    expect(r.ativos).toEqual({ atual: 2, anterior: 1, total: 4, hoje: 2 });
    expect(r.acessos.atual).toBe(10);
    expect(r.acessos.anterior).toBe(4);
    expect(r.acoes).toEqual({ atual: 3, anterior: 1 });
    expect(r.maisUsado).toEqual({ pagina: 'inspecoes', pct: 60 });
    expect(r.semAcesso30).toBe(2); // u3 (último acesso há 42 dias) e u4
    expect(r.usuarios[0]).toMatchObject({ uid: 'u1', acessos: 7, acoes: 2, ultimo: 200 });
    expect(r.acoesPorTipo.map(a => a.rotulo)).toEqual(['Agendamentos', 'E-mails enviados']);
    expect(r.porPerfil).toEqual([{ chave: 'admin', rotulo: 'admin', valor: 7 }, { chave: 'user_secretaria', rotulo: 'user_secretaria', valor: 3 }]);
    expect(r.serie28).toHaveLength(28);
    expect(r.serie28[27].valores).toEqual([8, 3]);
  });
});
