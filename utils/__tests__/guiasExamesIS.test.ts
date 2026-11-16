// Guias de exames no app: casamento da finalidade com o Anexo O, entrega das guias, card do detalhe e dialogs
// (utils/guiasExamesIS.ts), e as regras dos exames de utils/guiasExames.ts.
import { describe, expect, it } from 'vitest';
import {
  guiasEnviadasAoInspecionado,
  FINALIDADES_ANEXO_O, casarFinalidadeAnexoO, entregaEditavel, erroDataNascimento, erroEscolhaEnvioGuias, extrairUsuariosSecretaria,
  grupoPodeTerExames, mensagemEnvioGuias, patchEntregaGuias, prazoAberturaIS, precisaIdentificarFinalidade, primeiroNome,
  rotuloEmailGuias, situacaoGuias, textoEntregaGuias,
} from '../guiasExamesIS';
import { examesDasGuias, finalidadeTemExamesMinimos, idadeEm } from '../guiasExames';

describe('finalidade da IS × Anexo O', () => {
  it('lista do Anexo O sem quebras de linha', () => {
    expect(FINALIDADES_ANEXO_O).toContain('Ingresso SAM / SMV (oriundos do meio civil)');
    expect(FINALIDADES_ANEXO_O.every(f => !/\n/.test(f))).toBe(true);
  });
  it('casa por nome igual, sem acento/caixa/espaço extra', () => {
    expect(casarFinalidadeAnexoO('Controle trienal')).toBe('Controle trienal');
    expect(casarFinalidadeAnexoO('  controle   TRIENAL ')).toBe('Controle trienal');
    expect(casarFinalidadeAnexoO('Missão Antartica')).toBe('Missão Antártica');
    expect(casarFinalidadeAnexoO('Seleção para Cursos de carreira (🚫 AE)')).toBe('Seleção para Cursos de carreira (🚫 AE)');
  });
  it('casa pelos apelidos das finalidades da IS', () => {
    expect(casarFinalidadeAnexoO('Deixar o SMV')).toBe('Deixar o SAM, SMV, SMI ou SPG');
    expect(casarFinalidadeAnexoO('Ingresso no SMV (oriundos do SMI)')).toBe('Engajamento e Ingresso no SMV (oriundos do SMI)');
    expect(casarFinalidadeAnexoO('Engajamento')).toBe('Engajamento e Ingresso no SMV (oriundos do SMI)');
  });
  it('não casa finalidade de fora do Anexo O', () => {
    expect(casarFinalidadeAnexoO('Término de Incapacidade')).toBeNull();
    expect(casarFinalidadeAnexoO('')).toBeNull();
  });
  it('IA só quando não casa e o grupo pode ter exames mínimos', () => {
    expect(grupoPodeTerExames('Benefícios')).toBe(false);
    expect(grupoPodeTerExames('Verificações e Términos')).toBe(false);
    expect(grupoPodeTerExames('Controle Periódico')).toBe(true);
    expect(precisaIdentificarFinalidade('Controle Anual de Mergulho', 'Controle Periódico')).toBe(true);
    expect(precisaIdentificarFinalidade('Controle trienal', 'Controle Periódico')).toBe(false);
    expect(precisaIdentificarFinalidade('Término de Restrições', 'Verificações e Términos')).toBe(false);
  });
});

describe('dados do inspecionado', () => {
  const hoje = '2026-11-15';
  it('valida a data de nascimento', () => {
    expect(erroDataNascimento('', hoje)).toMatch(/Informe/);
    expect(erroDataNascimento('2027-01-01', hoje)).toMatch(/futura/);
    expect(erroDataNascimento('2020-01-01', hoje)).toMatch(/ano/);
    expect(erroDataNascimento('1990-02-28', hoje)).toBe('');
    expect(erroDataNascimento('1990-05-10', hoje)).toBe('');
  });
  it('primeiro nome (único dado enviado à IA)', () => {
    expect(primeiroNome('  MARIA DAS DORES ')).toBe('MARIA');
    expect(primeiroNome('')).toBe('');
  });
});

describe('entrega das guias', () => {
  it('marcar: presencial hoje e Aberta → Realizando Exames', () => {
    expect(patchEntregaGuias({ status: 'aberta' }, true, 'sec1', '2026-11-15')).toEqual({
      guiasEntregues: true, guiasEntreguesEm: '2026-11-15', guiasEntreguesVia: 'presencial', guiasEntreguesPor: 'sec1', status: 'realizando_exames',
    });
    expect(patchEntregaGuias({ status: 'agendada' }, true, 'sec1', '2026-11-15').status).toBeUndefined();
  });
  it('desmarcar: apaga os campos e volta a Aberta só se estava em Realizando Exames', () => {
    expect(patchEntregaGuias({ status: 'realizando_exames', guiasEntregues: true }, false, 'x', '2026-11-15')).toEqual({
      guiasEntregues: false, guiasEntreguesEm: null, guiasEntreguesVia: null, guiasEntreguesPor: null, status: 'aberta',
    });
    expect(patchEntregaGuias({ status: 'agendada' }, false, 'x', '2026-11-15').status).toBeUndefined();
  });
  it('texto e edição da caixa', () => {
    expect(textoEntregaGuias({ status: 'realizando_exames', guiasEntregues: true, guiasEntreguesVia: 'email', guiasEntreguesEm: '2026-11-14' })).toBe('por e-mail em 14/11/2026');
    expect(textoEntregaGuias({ status: 'realizando_exames', guiasEntregues: true, guiasEntreguesVia: 'presencial', guiasEntreguesEm: '2026-11-14', guiasEntreguesPor: 'sec1' })).toBe('em 14/11/2026 · sec1');
    expect(textoEntregaGuias({ status: 'aberta' })).toBe('');
    expect(entregaEditavel({ status: 'aberta' })).toBe(true);
    expect(entregaEditavel({ status: 'realizando_exames', guiasEntregues: true, guiasEntreguesVia: 'email' })).toBe(false);
    expect(entregaEditavel({ status: 'tis_assinado', situacao: 'finalizada' })).toBe(false);
    expect(rotuloEmailGuias(false)).toBe('Enviar por e-mail');
    expect(rotuloEmailGuias(true)).toBe('Reenviar por e-mail');
  });
});

describe('card do detalhe', () => {
  it('situação das guias', () => {
    expect(situacaoGuias({ situacao: 'aberta', guiasExames: { caminho: 'x' } }, true)).toBe('geradas');
    expect(situacaoGuias({ situacao: 'aberta' }, true)).toBe('sem_guias');
    expect(situacaoGuias({ situacao: 'aberta' }, false)).toBe('nao_se_aplica');
    expect(situacaoGuias({ situacao: 'finalizada', guiasExames: null }, true)).toBe('apagadas');
    expect(situacaoGuias({ situacao: 'finalizada', guiasEntregues: true }, true)).toBe('apagadas');
    expect(situacaoGuias({ situacao: 'finalizada' }, true)).toBe('nao_se_aplica');
  });
});

describe('dialogs', () => {
  const valido = (s: string) => /@/.test(s);
  it('lista da SEC-JRS: rótulo = usuário, ordenada, descarta inválidos', () => {
    expect(extrairUsuariosSecretaria({ success: true, usuarios: [{ uid: '2', usuario: 'sec2' }, { uid: '1', usuario: 'Sec1', nome: 'Fulana' }, { uid: 3 }] }))
      .toEqual([{ uid: '1', usuario: 'Sec1', nome: 'Fulana' }, { uid: '2', usuario: 'sec2' }]);
    expect(extrairUsuariosSecretaria({ success: true, lista: [{ uid: 'a', usuario: 'x' }] })).toEqual([{ uid: 'a', usuario: 'x' }]);
    expect(extrairUsuariosSecretaria({ success: true })).toEqual([]);
  });
  it('validação da escolha do envio', () => {
    const base = { inspecionado: false, secretaria: false, secretariaUids: [], email: '' };
    expect(erroEscolhaEnvioGuias(base, '', valido)).toMatch(/quem/);
    expect(erroEscolhaEnvioGuias({ ...base, secretaria: true }, '', valido)).toMatch(/SEC-JRS/);
    expect(erroEscolhaEnvioGuias({ ...base, inspecionado: true }, '', valido)).toMatch(/e-mail/);
    expect(erroEscolhaEnvioGuias({ ...base, inspecionado: true }, 'a@b.c', valido)).toBe('');
    expect(erroEscolhaEnvioGuias({ ...base, inspecionado: true, email: 'a@b.c' }, '', valido)).toBe('');
    expect(erroEscolhaEnvioGuias({ ...base, secretaria: true, secretariaUids: ['1'] }, '', valido)).toBe('');
  });
  it('mensagem de sucesso', () => {
    expect(mensagemEnvioGuias(10, { paraInspecionado: 'a@b.c', paraSecretaria: ['x', 'y'], emailSalvo: true }))
      .toBe('Guias da IS 10 enviadas ao inspecionado (a@b.c) e à SEC-JRS (2). E-mail salvo no cadastro do inspecionado.');
  });
  it('prazo do e-mail de abertura', () => {
    expect(prazoAberturaIS({ grupoFinalidade: 'Benefícios', comExamesMinimos: false, dataAbertura: '2026-11-15' })).toBe('60 dias a partir de 15/11/2026 para agendar a IS.');
    expect(prazoAberturaIS({ grupoFinalidade: 'Controle Periódico', comExamesMinimos: true, dataAbertura: '2026-11-15' })).toMatch(/^7 dias úteis .* guias/);
    expect(prazoAberturaIS({ grupoFinalidade: 'Verificações e Términos', comExamesMinimos: false, dataAbertura: '2026-11-15' })).toMatch(/^7 dias úteis .* agendar/);
  });
});

describe('regras temporárias (contrato de utils/guiasExames.ts)', () => {
  it('idade completa', () => {
    expect(idadeEm('1986-11-16', '2026-11-15')).toBe(39);
    expect(idadeEm('1986-11-15', '2026-11-15')).toBe(40);
  });
  it('exames por finalidade, sexo e idade, sem Biometria, Oftalmologia geral nem toxicológico', () => {
    const m = examesDasGuias('Controle trienal', 'Masculino', 30);
    const todos = m.flatMap(g => g.exames);
    expect(todos).not.toContain('Biometria');
    expect(todos).not.toContain('Oftalmologia geral');
    expect(todos.some(e => /toxicol/i.test(e))).toBe(false);
    expect(todos.some(e => /gravidez|TIG/.test(e))).toBe(false);
    expect(m[0].grupo).toBe('Exames laboratoriais');
    const lab = m[0].exames;
    expect([...lab].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(lab);
  });
  it('finalidade com exames mínimos', () => {
    expect(finalidadeTemExamesMinimos('Controle trienal')).toBe(true);
    expect(finalidadeTemExamesMinimos('IS inopinada de avaliação toxicológica preventiva direcionada')).toBe(false);
    expect(finalidadeTemExamesMinimos('Término de Incapacidade')).toBe(false);
  });
});

describe('guias enviadas ao inspecionado', () => {
  it('pela marca do servidor ou pela entrega via e-mail', () => {
    expect(guiasEnviadasAoInspecionado({ emailGuiasInspecionadoEm: { seconds: 1 } })).toBe(true);
    expect(guiasEnviadasAoInspecionado({ guiasEntregues: true, guiasEntreguesVia: 'email' })).toBe(true);
    expect(guiasEnviadasAoInspecionado({ guiasEntregues: true, guiasEntreguesVia: 'presencial' })).toBe(false);
    expect(guiasEnviadasAoInspecionado({})).toBe(false);
  });
});
