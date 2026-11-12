// E-mail ao NAC (servidor/email/nac.ts; regras em utils/emailNac.ts), pendência dos agendamentos e e-mails de teste.
import { describe, expect, it } from 'vitest';
import { pendenteNac, pendentesNac, periodoNac, paginarNac, ehCargoSmi, LINHAS_POR_PAGINA } from '../emailNac';
import { agendamentoPendente } from '../emailAgendamentoIS';
import { montarEmailNac, ccSmi } from '../../servidor/email/nac';
import { montarEmailTeste, TIPOS_TESTE, ficticios } from '../../servidor/email/teste';
import { assinaturaSemSignatario } from '../../servidor/email/comum';
import { CONFIG_EMAILS_PADRAO, mesclarConfigEmails } from '../../config/emails';

const placeholder = /\{\{[#^/]?\w+\}\}/;
const VT = 'Verificações e Términos';

describe('pendência NAC', () => {
  it('só finalizada (TIS assinado) de Verificações e Términos, sem envio', () => {
    expect(pendenteNac({ status: 'tis_assinado', grupoFinalidade: VT })).toBe(true);
    expect(pendenteNac({ status: 'tis_assinado', grupoFinalidade: VT, emailNacEnviadoEm: { seconds: 1 } })).toBe(false);
    expect(pendenteNac({ status: 'assinaturas_pendentes', grupoFinalidade: VT })).toBe(false);
    expect(pendenteNac({ status: 'cancelada', grupoFinalidade: VT })).toBe(false);
    expect(pendenteNac({ status: 'tis_assinado', grupoFinalidade: 'Benefícios' })).toBe(false);
  });
  it('ordena pela data do laudo e calcula o período (mais antiga → mais recente)', () => {
    const l = pendentesNac([
      { status: 'tis_assinado', grupoFinalidade: VT, dataLaudo: '2026-11-09' },
      { status: 'tis_assinado', grupoFinalidade: VT, dataLaudo: '2026-11-03' },
    ]);
    expect(l.map(i => i.dataLaudo)).toEqual(['2026-11-03', '2026-11-09']);
    expect(periodoNac(['2026-11-09', '', '2026-11-03', '2026-11-11'])).toEqual({ inicio: '03/11/2026', fim: '11/11/2026' });
  });
  it('paginação do anexo deixa espaço para a assinatura na última página', () => {
    const p = paginarNac(Array.from({ length: LINHAS_POR_PAGINA }, (_, i) => i));
    expect(p.length).toBe(2);
    expect(p[p.length - 1].ultima).toBe(true);
    expect(p[0].multi).toBe(true);
    expect(paginarNac([]).length).toBe(1);
    expect(paginarNac([1, 2, 3])).toEqual([{ linhas: [1, 2, 3], num: 1, total: 1, multi: false, ultima: true }]);
  });
  it('CC dinâmico: institucionais dos user_medicos_geral ativos com cargo SMI', () => {
    expect(ehCargoSmi(' smi ')).toBe(true);
    expect(ccSmi([
      { perfil: 'user_medicos_geral', ativo: true, cargo: 'SMI', email: 'Fulano@marinha.mil.br' },
      { perfil: 'user_medicos_geral', ativo: true, cargo: 'SMI', email: 'fulano@gmail.com' },
      { perfil: 'user_medicos_geral', ativo: false, cargo: 'SMI', email: 'inativo@marinha.mil.br' },
      { perfil: 'user_medicos_geral', ativo: true, cargo: 'Clínica', email: 'outro@marinha.mil.br' },
      { perfil: 'user_medicos', ativo: true, cargo: 'SMI', email: 'medico@marinha.mil.br' },
    ])).toEqual(['fulano@marinha.mil.br']);
  });
});

describe('montarEmailNac', () => {
  const itens = [
    { dataLaudo: '2026-11-11', inspecionado: '3SG-EP 12.0374.60 JOAO PAULO FERREIRA MELO', om: 'EAMPE', numero_is: '1252674', finalidade: 'Término de Restrições', laudo: 'Apto para o SAM com restrições por 30 dias' },
    { dataLaudo: '2026-11-03', inspecionado: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', nomeCompleto: 'Carlos Antonio Pereira da Silva', om: 'HNRe', numero_is: '1253621', finalidade: 'Verificação de Deficiência Funcional', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS' },
  ];
  const r = montarEmailNac(itens);

  it('assunto, período e placeholders preenchidos, sem JavaScript', () => {
    expect(r.assunto).toBe('INSPEÇÕES DE SAÚDE VDF E TÉRMINOS');
    expect(r.periodo).toEqual({ inicio: '03/11/2026', fim: '11/11/2026' });
    for (const h of [r.html, r.htmlAnexo]) {
      expect(h).not.toMatch(placeholder);
      expect(h).not.toMatch(/<script|javascript:|\son\w+=|<sc-/i);
      expect(h).toContain('03/11/2026');
    }
    expect(r.html).toContain(CONFIG_EMAILS_PADRAO.saudacaoNac);
  });
  it('e-mail com só o nome; anexo com posto, NIP e nome', () => {
    expect(r.html).toContain('>CARLOS ANTONIO PEREIRA DA SILVA</span>');
    expect(r.html).toContain('>JOAO PAULO FERREIRA MELO</span>');
    expect(r.html).not.toContain('07.3836.57');
    expect(r.htmlAnexo).toContain('3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA');
    expect(r.htmlAnexo).toContain('IS 1253621');
  });
  it('anexo com várias páginas: assinatura do Presidente só na última', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({ ...itens[0], numero_is: String(1250000 + i), dataLaudo: `2026-10-${String(i + 1).padStart(2, '0')}` }));
    const a = montarEmailNac(muitos).htmlAnexo;
    const paginas = a.split('<section class="page"').slice(1);
    expect(paginas.length).toBeGreaterThan(1);
    paginas.forEach((pg, i) => expect(pg.includes('alt="Mauriston Renan Martins Silva · Capitão-Tenente (Md) · Presidente"'), `página ${i + 1}`).toBe(i === paginas.length - 1));
    expect(a).toContain(`Página 1 de ${paginas.length}`);
  });
  it('ordem pela data do laudo e assinatura do Presidente na última página do anexo', () => {
    expect(r.html.indexOf('CARLOS')).toBeLessThan(r.html.indexOf('JOAO'));
    expect(r.htmlAnexo.match(/data:image\/png;base64/g)!.length).toBeGreaterThanOrEqual(3);
    expect(r.htmlAnexo).not.toContain('Página 1 de');
  });
});

describe('agendamento pendente (badge do "Enviar Email")', () => {
  const base = { grupoFinalidade: VT, status: 'agendada', dataEntrevista: '2026-11-13T13:40' };
  it('agendada de hoje em diante, sem e-mail desta data', () => {
    expect(agendamentoPendente(base, '2026-11-12')).toBe(true);
    expect(agendamentoPendente(base, '2026-11-13')).toBe(true);
    expect(agendamentoPendente(base, '2026-11-14')).toBe(false);
    expect(agendamentoPendente({ ...base, emailAgendamentoDataEntrevista: '2026-11-13T13:40' }, '2026-11-12')).toBe(false);
    expect(agendamentoPendente({ ...base, grupoFinalidade: 'Benefícios' }, '2026-11-12')).toBe(false);
    expect(agendamentoPendente({ ...base, status: 'faltou' }, '2026-11-12')).toBe(false);
  });
});

describe('e-mails de teste', () => {
  // Gerador com semente (determinístico nos testes); no servidor é Math.random.
  const semente = (n: number) => () => { n = (n * 1103515245 + 12345) % 2147483648; return n / 2147483648; };

  it('dados fictícios variam a cada geração', () => {
    const a = ficticios(semente(1)).pessoa();
    const b = ficticios(semente(2)).pessoa();
    expect(a.inspecionado).not.toBe(b.inspecionado);
    expect(a.inspecionado).toMatch(/\d{2}\.\d{4}\.\d{2} /);
    expect(a.inspecionado.endsWith(a.nome)).toBe(true);
  });
  it('todos os tipos montam sem placeholder nem JavaScript (várias sementes)', () => {
    for (let n = 1; n <= 20; n++) for (const tipo of TIPOS_TESTE) {
      const r = montarEmailTeste(tipo, assinaturaSemSignatario(), mesclarConfigEmails(undefined), semente(n)) as { assunto: string; html: string; htmlAnexo?: string };
      expect(r.assunto, tipo).toBeTruthy();
      expect(r.html, tipo).not.toMatch(placeholder);
      expect(r.html, tipo).not.toMatch(/<script|javascript:/i);
      if (r.htmlAnexo) expect(r.htmlAnexo, tipo).not.toMatch(placeholder);
    }
  });
  it('destinatários de teste padrão e sem CCO', () => {
    expect(CONFIG_EMAILS_PADRAO.testes).toEqual({ para: ['mauriston.martins@marinha.mil.br'], cc: ['mauriston@oncoortopedia.com'] });
  });
});
