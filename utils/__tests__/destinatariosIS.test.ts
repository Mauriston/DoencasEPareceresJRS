import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TABELA_DESTINATARIOS, destinatariosDaMensagem, destinatariosPorChaves, destinoExibido, finalidadeDaTabela,
  situacoesDoRotulo, tipoDoLaudo,
} from '../destinatariosIS';
import { postoDoInspecionado } from '../../services/destinatariosIA';

// Tabela do Anexo M da DGPM-406 (data/destinatariosInspecoes.json): finalidadeIS → situacaoInspecionado → laudo.

const OP_OM_JUNTOS = { para: 'Órgão de Pessoal, OM de Origem', info: '—' };
const OP__OM = { para: 'Órgão de Pessoal', info: 'OM de Origem' };
const DN = { para: 'DN', info: 'DPM, OM de Origem' };
const DSM = { para: 'DSM', info: 'Órgão de Pessoal, OM de Origem' };
const INATIVOS = { para: 'DPM ou CPesFN', info: 'SVPM' };
const PENSIONISTAS = { para: 'SVPM', info: 'OM de Origem' };
const JD = 'OM de Origem, Demais OM relacionadas no Ofício de apresentação';

describe('estrutura do JSON', () => {
  it('toda linha tem finalidade, situação reconhecida e laudos com PARA', () => {
    expect(TABELA_DESTINATARIOS.length).toBeGreaterThan(30);
    for (const f of TABELA_DESTINATARIOS) {
      expect(f.finalidadeIS.trim()).not.toBe('');
      for (const s of f.situacoes) {
        expect(situacoesDoRotulo(s.situacaoInspecionado), `${f.finalidadeIS} › ${s.situacaoInspecionado}`).not.toEqual([]);
        expect(s.laudos.length).toBeGreaterThan(0);
        for (const l of s.laudos) expect(l.para.trim(), `${f.finalidadeIS} › ${l.laudo}`).not.toBe('');
      }
    }
  });
  it('finalidades sem repetição', () => {
    const nomes = TABELA_DESTINATARIOS.map(f => f.finalidadeIS);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
  it('"Null" e vazio viram "—"', () => {
    expect(destinoExibido('Null')).toBe('—');
    expect(destinoExibido('')).toBe('—');
    expect(destinoExibido('SVPM')).toBe('SVPM');
  });
  it('situações com vírgula no nome', () => {
    expect(situacoesDoRotulo('Pensionistas, ex-combatentes e seus Dependentes')).toEqual(['pensionista']);
    expect(situacoesDoRotulo('Militares da ativa, Servidor Civil')).toEqual(['ativa', 'servidor']);
    expect(situacoesDoRotulo('Militares Inativos')).toEqual(['inativo']);
  });
});

describe('finalidade cadastrada → finalidade da tabela', () => {
  it.each([
    ['Controle anual de praça de máquinas', 'Anual de máquinas'],
    ['Controle trienal', 'Controle Trienal'],
    ['Controle semestral Raios-X', 'Semestral de RX, substâncias radioativas e Terapia Antineoplásica'],
    ['Manipulação e admin Terapia Antineoplásica', 'Manipulação de terapia antineoplásica'],
    ['Serviço com explosivos', 'Propelentes e explosivos'],
    ['Serviço com OTTO FUELL II', 'Propelentes e explosivos'],
    ['Seleção para Cursos de carreira (🚫 AE)', 'Cursos de carreira'],
    ['Engajamento', 'Engajamento'],
    ['Reengajamento', 'Reengajamento'],
    ['Localidade com deficiência em assistência sanitária (LDAS)', 'Localidade Deficiente em Assistência Sanitária'],
    ['Missão Antártica', 'Missão Antártica'],
    ['Missão no exterior (> 3m)', 'Missão no Exterior'],
    ['LTSPF', 'Licença para tratamento de saúde de pessoa da família'],
    ['Reversão ou Reintegração ao SPG', 'Reversão ao SPG'],
    ['Verificação de Deficiência Funcional - Fato novo', 'Verificação de Deficiência Funcional'],
    ['Verificação de Deficiência Funcional - SMI', 'Verificação de Deficiência Funcional - SMI'],
    ['Verificação de Deficiência Funcional - SC', 'Verificação de Deficiência Funcional - Servidor Civil'],
    ['Exame de Sanidade em IPM', 'Justiça e Disciplina'],
    ['Revisão de reforma relacionada ao serviço', 'Revisão de Reforma'],
    ['Isenção de pagamento de imposto de renda', 'Benefícios'],
    ['Pensão especial à viúva de militar', 'Benefícios'],
    ['Controle complementar de operador de reator nuclear', 'Controle complementar de operador de reator nuclear'],
  ])('%s → %s', (f, chave) => expect(finalidadeDaTabela(f)).toBe(chave));

  it('não cobertas pelo Anexo M', () => {
    for (const f of ['Controle Anual de Mergulho', 'Ingresso no SMV (oriundos do SMI)', 'Designação de militares RM1',
      'IS para conclusão de Curso de Formação', 'IS inopinada de avaliação toxicológica preventiva direcionada', 'Reintegração de Candidato']) {
      expect(finalidadeDaTabela(f), f).toBeNull();
    }
  });

  it('grupo "Benefícios" cobre finalidades com outro nome', () => {
    expect(finalidadeDaTabela('Verificação Post-mortem de ex-militar', 'Benefícios')).toBe('Benefícios');
  });
});

describe('PARA/INFO: finalidade × situação × laudo', () => {
  it('"Any": qualquer laudo', () => {
    for (const laudo of ['Apto', 'Incapaz temporariamente por 30 dias', 'Incapaz definitivamente para o SAM']) {
      expect(destinatariosDaMensagem('Controle trienal', laudo, { vinculo: 'Carreira' })).toMatchObject({ ...OP_OM_JUNTOS, regra: 'tabela' });
      expect(destinatariosDaMensagem('Controle semestral Raios-X', laudo, { vinculo: 'Temporário' })).toMatchObject(DSM);
      expect(destinatariosDaMensagem('Deixar o SMV', laudo, { vinculo: 'Temporário' })).toMatchObject(DN);
      expect(destinatariosDaMensagem('Missão Antártica', laudo, { vinculo: 'Carreira' })).toMatchObject({ para: 'SECIRM', info: 'Órgão de Pessoal, OM de Origem' });
    }
  });

  it('finalidade com uma só situação vale para qualquer vínculo (temporário é militar da ativa)', () => {
    expect(destinatariosDaMensagem('Controle trienal', 'Apto', { vinculo: 'Temporário' })).toMatchObject(OP_OM_JUNTOS);
    expect(destinatariosDaMensagem('Controle trienal', 'Apto')).toMatchObject(OP_OM_JUNTOS);
  });

  it('Benefícios: a situação do inspecionado escolhe a linha', () => {
    const f = 'Isenção de pagamento de imposto de renda';
    expect(destinatariosDaMensagem(f, 'Apto', { vinculo: 'Inativo' })).toMatchObject(INATIVOS);
    expect(destinatariosDaMensagem(f, 'Apto', { vinculo: 'Pensionista' })).toMatchObject(PENSIONISTAS);
    expect(destinatariosDaMensagem('Pensão militar para beneficiário inválido', 'Incapaz', { vinculo: 'Dependente' })).toMatchObject(PENSIONISTAS);
    expect(destinatariosDaMensagem('Auxílio invalidez de militar inativo', 'Apto', { vinculo: 'Inativo' })).toMatchObject(INATIVOS);
    // Dependente: depende do titular.
    expect(destinatariosDaMensagem('Dependência de familiar de militar', 'Apto', { vinculo: 'Dependente' })).toBeNull();
    expect(destinatariosDaMensagem('Dependência de familiar de militar', 'Apto', { vinculo: 'Dependente', titularInativo: false })).toMatchObject({ para: 'OM do militar', info: '—' });
    expect(destinatariosDaMensagem('Dependência de familiar de militar', 'Apto', { vinculo: 'Dependente', titularInativo: true })).toMatchObject({ para: 'CPesFN ou SVPM ou OMAC', info: '—' });
    // Sem vínculo, Benefícios tem situações com destinos diferentes.
    expect(destinatariosDaMensagem(f, 'Apto')).toBeNull();
    expect(destinatariosDaMensagem('Verificação Post-mortem de ex-militar', 'Apto', { vinculo: 'Carreira', grupoFinalidade: 'Benefícios' })).toBeNull();
  });

  it('Justiça e Disciplina: ativa → Órgão de Pessoal; temporário → DN', () => {
    expect(destinatariosDaMensagem('Exame de Sanidade em IPM', 'Imputável', { vinculo: 'Carreira' })).toMatchObject({ para: 'Órgão de Pessoal', info: JD });
    expect(destinatariosDaMensagem('Exame de Sanidade em IPM', 'Imputável', { vinculo: 'Temporário' })).toMatchObject({ para: 'DN', info: JD });
  });

  it('Término de Incapacidade', () => {
    const f = 'Término de Incapacidade';
    expect(destinatariosDaMensagem(f, 'Apto para o SAM', { vinculo: 'Carreira' })).toMatchObject({ para: 'Órgão de Pessoal', info: 'SDP, OM de Origem', regra: 'tabela' });
    expect(destinatariosDaMensagem(f, 'Apto com restrições por 90 dias', { vinculo: 'Carreira' })).toMatchObject({ para: 'Órgão de Pessoal', info: 'SDP, OM de Origem' });
    expect(destinatariosDaMensagem(f, 'Incapaz definitivamente para o SAM', { vinculo: 'Carreira' })).toMatchObject(OP__OM);
    expect(destinatariosDaMensagem(f, 'Incapaz temporariamente por 30 dias', { vinculo: 'Carreira' })).toBeNull(); // sem linha no Anexo M
    expect(destinatariosDaMensagem(f, 'Apto com restrições por 60 dias', { vinculo: 'Temporário' })).toMatchObject(DN);
    expect(destinatariosDaMensagem(f, 'Incapaz definitivamente para o SAM com amparo legal', { vinculo: 'Temporário' })).toMatchObject({ para: 'DN + DPM', info: 'OM de Origem', regra: 'tabela' });
    // Sem "com amparo legal" no laudo, a linha de amparo legal não é usada por analogia.
    expect(destinatariosDaMensagem(f, 'Incapaz definitivamente para o SAM', { vinculo: 'Temporário' })).toBeNull();
  });

  it('Término de Restrições: "em prorrogação" tem linha própria', () => {
    const f = 'Término de Restrições';
    expect(destinatariosDaMensagem(f, 'Apto para o SAM', { vinculo: 'Carreira' })).toMatchObject(OP_OM_JUNTOS);
    expect(destinatariosDaMensagem(f, 'Apto com restrições por 30 dias', { vinculo: 'Carreira' })).toMatchObject({ para: 'Órgão de Pessoal, OM de Origem', info: 'SDP, OM de Origem' });
    expect(destinatariosDaMensagem(f, 'Apto para o SAM com restrições por 30 dias, em prorrogação', { vinculo: 'Carreira' }))
      .toMatchObject({ para: 'Órgão de Pessoal, OM de Origem', info: '—', laudo: 'Apto para o SAM com restrições (...) em prorrogação...' });
    expect(destinatariosDaMensagem(f, 'Apto', { vinculo: 'Temporário' })).toMatchObject(DN);
  });

  it('VDF: militar da ativa, temporário e servidor civil', () => {
    const f = 'Verificação de Deficiência Funcional';
    expect(destinatariosDaMensagem(f, 'Apto com restrições por 90 dias', { vinculo: 'Carreira' })).toMatchObject(OP__OM);
    expect(destinatariosDaMensagem(f, 'Incapaz temporariamente, necessitando de 30 dias de LTS', { vinculo: 'Carreira' })).toMatchObject({ para: 'SDP', info: 'Órgão de Pessoal, OM de Origem' });
    expect(destinatariosDaMensagem(f, 'Incapaz definitivamente para o exercício da especialidade', { vinculo: 'Carreira' })).toMatchObject(OP__OM);
    expect(destinatariosDaMensagem(f, 'Apto com restrições por 90 dias', { vinculo: 'Temporário' })).toMatchObject({ para: 'SDP', info: 'DPM, OM de Origem' });
    expect(destinatariosDaMensagem(f, 'Incapaz temporariamente para o SMV', { vinculo: 'Carreira' })).toMatchObject(DN); // serviço do laudo prevalece
    expect(destinatariosDaMensagem(f, 'Apto com restrições', { inspecionado: '1T (RM2-Md) 12.3456.78 FULANO' })).toMatchObject({ para: 'SDP' });
    expect(destinatariosDaMensagem(f, 'Apto com restrições por 90 dias')).toBeNull(); // sem vínculo e sem serviço no laudo
    // Servidor civil: laudo SPG leva à variante "- Servidor Civil".
    expect(destinatariosDaMensagem(f, 'Incapaz temporariamente para o SPG por 90 dias')).toMatchObject({ para: 'OM de Origem', info: '—', finalidadeIS: 'Verificação de Deficiência Funcional - Servidor Civil' });
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional - SC', 'Incapaz definitivamente para o SPG')).toMatchObject(OP__OM);
  });

  it('VDF - SMI: laudos A/B1/B2/C', () => {
    for (const l of ['Apto A', 'Incapaz B1', 'Incapaz B2', 'Incapaz C']) {
      expect(destinatariosDaMensagem('Verificação de Deficiência Funcional - SMI', l, { vinculo: 'Temporário' }), l).toMatchObject({ para: 'DN', info: 'OM de Origem', regra: 'tabela' });
    }
  });

  it('servidor civil: Término de Incapacidade usa a variante "- Servidor Civil"', () => {
    expect(destinatariosDaMensagem('Término de Incapacidade', 'Apto para o SPG')).toMatchObject({ ...OP_OM_JUNTOS, finalidadeIS: 'Término de Incapacidade - Servidor Civil' });
    expect(destinatariosDaMensagem('Exame médico periódico - Servidor Civil', 'Apto com restrições por 6 meses')).toMatchObject({ para: 'OM sede da JRS', info: 'DPM-BSB, OM de Origem' });
  });
});

describe('busca pelas chaves (resposta da IA)', () => {
  it('chaves literais ou com variação de caixa/acento', () => {
    expect(destinatariosPorChaves('Benefícios', 'Militares Inativos', 'Any')).toMatchObject(INATIVOS);
    expect(destinatariosPorChaves('beneficios', 'militares inativos', 'qualquer')).toMatchObject(INATIVOS);
    expect(destinatariosPorChaves('Término de Incapacidade', 'Militares da ativa', 'Apto para o SAM')).toMatchObject({ info: 'SDP, OM de Origem' });
  });
  it('chave inexistente → null (a IA não inventa destinatário)', () => {
    expect(destinatariosPorChaves('Finalidade inventada', 'Militares da ativa', 'Any')).toBeNull();
    expect(destinatariosPorChaves('Benefícios', 'Militares da ativa', 'Any')).toBeNull();
    expect(destinatariosPorChaves('Término de Incapacidade', 'Militares da ativa', 'Laudo inventado')).toBeNull();
  });
});

describe('auxiliares', () => {
  it('tipo do laudo ignora período e "em prorrogação"', () => {
    expect(tipoDoLaudo('Apto com restrições por 90 dias')).toBe('apto_restricoes');
    expect(tipoDoLaudo('Apto para o SAM com restrições por 90 dias, em prorrogação')).toBe('apto_restricoes');
    expect(tipoDoLaudo('Inapto com restrições')).toBeNull();
    expect(tipoDoLaudo('Continua incapaz temporariamente para o SAM')).toBe('incapaz_temporario');
    expect(tipoDoLaudo('Incapaz definitivamente para o SAM')).toBe('incapaz_definitivo');
  });
  it('posto enviado à IA sem NIP e nome', () => {
    expect(postoDoInspecionado('1T (RM2-Md) 12.3456.78 FULANO DE TAL')).toBe('1T (RM2-Md)');
    expect(postoDoInspecionado('3SG-EF 12345678 BELTRANO')).toBe('3SG-EF');
  });
  it('todas as finalidades do app estão mapeadas ou listadas como não cobertas', () => {
    const NAO_COBERTAS = ['Controle Anual de Mergulho', 'Ingresso no SMV (oriundos do SMI)', 'Designação de militares RM1',
      'IS para conclusão de Curso de Formação', 'IS inopinada de avaliação toxicológica preventiva direcionada', 'Reintegração de Candidato'];
    const grupos = (JSON.parse(readFileSync(join(process.cwd(), 'public/finalidadesIS.json'), 'utf8')) as { grupos: { grupo: string; finalidades: { nome: string }[] }[] }).grupos;
    const sem = grupos.flatMap(g => g.finalidades.filter(f => !finalidadeDaTabela(f.nome, g.grupo)).map(f => f.nome));
    expect(sem.sort()).toEqual([...NAO_COBERTAS].sort());
  });
});
