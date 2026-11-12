// E-mail "IS AGENDADAS" do dia seguinte: calendário de envio, destinatários e montagem (servidor/email/agendaIS.ts).
import { describe, expect, it } from 'vitest';
import {
  decidirEnvioAutomatico, destinatariosAgendaIS, assuntoAgendaIS, caminhoPdfAgendaIS, dataTituloDeIso, hojeEmRecife, dataIsoValida, somarDias,
} from '../emailAgendaIS';
import { montarEmailAgenda } from '../../servidor/email/agendaIS';
import { renderizarTemplate } from '../../servidor/email/template';

describe('calendário do envio automático (18h, Recife)', () => {
  it('domingo a quinta envia a agenda do dia seguinte', () => {
    expect(decidirEnvioAutomatico('2026-11-08')).toEqual({ enviar: true, data: '2026-11-09' }); // domingo → segunda
    expect(decidirEnvioAutomatico('2026-11-12')).toEqual({ enviar: true, data: '2026-11-13' }); // quinta → sexta
  });
  it('sexta e sábado não enviam', () => {
    expect(decidirEnvioAutomatico('2026-11-13').enviar).toBe(false);
    expect(decidirEnvioAutomatico('2026-11-14').enviar).toBe(false);
  });
  it('não envia em véspera de feriado', () => {
    const d = decidirEnvioAutomatico('2026-11-19'); // quinta, véspera da Consciência Negra (20/11)
    expect(d.enviar).toBe(false);
    if (d.enviar === false) expect(d.motivo).toContain('Consciência Negra');
    expect(decidirEnvioAutomatico('2026-12-24').enviar).toBe(false); // véspera de Natal
  });
  it('datas', () => {
    expect(hojeEmRecife(new Date('2026-11-13T02:30:00Z'))).toBe('2026-11-12'); // 23:30 em Recife
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(dataTituloDeIso('2026-11-13')).toBe('13/11/2026 (SEXTA-FEIRA)');
    expect(dataIsoValida('2026-02-30')).toBe(false);
    expect(assuntoAgendaIS('2026-11-13')).toBe('IS AGENDADAS EM 13/11/2026');
    expect(caminhoPdfAgendaIS('2026-11-13')).toBe('agendaIS/2026/IS_AGENDADAS_2026-11-13.pdf');
  });
});

describe('destinatários', () => {
  const usuarios = [
    { perfil: 'admin', ativo: true, email: 'admin@marinha.mil.br', gmail: 'admin@gmail.com' },
    { perfil: 'user_medicos', ativo: true, email: 'Medico@Marinha.mil.br', gmail: 'medico@gmail.com' },
    { perfil: 'user_medicos_mpi', ativo: true, email: 'mpi@outro.com', gmail: 'mpi@gmail.com' },
    { perfil: 'user_secretaria', ativo: true, email: 'sec@marinha.mil.br', gmail: 'sec@gmail.com' },
    { perfil: 'user_medicos_geral', ativo: true, email: 'geral@marinha.mil.br', gmail: 'geral@gmail.com' },
    { perfil: 'user_medicos', ativo: false, email: 'inativo@marinha.mil.br', gmail: 'inativo@gmail.com' },
  ];
  it('PARA: caixa da JRS + institucionais dos médicos; CC: Gmail de Admin, médicos, MPI e Secretaria', () => {
    expect(destinatariosAgendaIS(usuarios, 'hnre.jrs@marinha.mil.br')).toEqual({
      para: ['hnre.jrs@marinha.mil.br', 'medico@marinha.mil.br'],
      cc: ['admin@gmail.com', 'medico@gmail.com', 'mpi@gmail.com', 'sec@gmail.com'],
    });
  });
});

describe('renderizador', () => {
  it('seção invertida aparece só com lista vazia', () => {
    const t = '{{#l}}[{{x}}]{{/l}}{{^l}}vazio{{/l}}';
    expect(renderizarTemplate(t, { l: [] })).toBe('vazio');
    expect(renderizarTemplate(t, { l: [{ x: 1 }] })).toBe('[1]');
  });
});

describe('montarEmailAgenda', () => {
  const agenda = {
    data: '2026-11-13',
    agendamentos: [{ hora: '13:00', nome: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', om: 'HNRe', numero_is: '1253621', finalidade: 'Término de Restrições', medico: 'CT JÚLIO CÉSAR' }],
    concursos: [{ concurso: 'CP-C-FSD-FN-TI/2027', matricula: '65599-8', candidato: 'DAYVID RUAN DA SILVA OLIVEIRA' }],
  };
  const placeholder = /\{\{[#^/]?\w+\}\}/;

  it('com IS e concursos: placeholders preenchidos, sem JavaScript, bloco de concursos no e-mail e no anexo', () => {
    const r = montarEmailAgenda(agenda);
    expect(r.assunto).toBe('IS AGENDADAS EM 13/11/2026');
    for (const h of [r.html, r.htmlAnexo]) {
      expect(h).not.toMatch(placeholder);
      expect(h).not.toMatch(/<script|javascript:|\son\w+=/i);
      expect(h).toContain('13/11/2026 (SEXTA-FEIRA)');
      expect(h).toContain('CT JÚLIO CÉSAR');
      expect(h).toContain('INSPEÇÕES DE SAÚDE DE CONCURSOS');
      expect(h).not.toContain('Não há Inspeções de Saúde agendadas');
    }
    expect(r.html).not.toContain('authuser');
    expect(r.htmlAnexo.match(/<section class="page"/g)).toHaveLength(2);
  });

  it('sem IS nem concursos: e-mail sai com o aviso, sem o bloco de concursos; anexo com uma página', () => {
    const r = montarEmailAgenda({ data: '2026-11-16', agendamentos: [], concursos: [] });
    for (const h of [r.html, r.htmlAnexo]) {
      expect(h).toContain('Não há Inspeções de Saúde agendadas para esta data.');
      expect(h).not.toContain('INSPEÇÕES DE SAÚDE DE CONCURSOS');
      expect(h).not.toMatch(placeholder);
    }
    expect(r.htmlAnexo.match(/<section class="page"/g)).toHaveLength(1);
  });
});
