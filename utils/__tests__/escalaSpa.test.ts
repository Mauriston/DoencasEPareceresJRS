import { describe, it, expect } from 'vitest';
import { corDoDia, feriados, lerCsvEscala, servicosDoUsuario, faceInicial, chaveNome, nomeExibicao } from '../escalaSpa';

describe('cores e feriados', () => {
  it('fim de semana/feriado vermelho, festas maiores roxo, resto branco', () => {
    expect(corDoDia('2026-11-06')).toBe('branca'); // sexta
    expect(corDoDia('2026-11-07')).toBe('vermelha'); // sábado
    expect(corDoDia('2026-11-20')).toBe('vermelha'); // Consciência Negra (sexta)
    expect(corDoDia('2026-12-25')).toBe('roxa');
    expect(corDoDia('2026-02-17')).toBe('roxa'); // terça de Carnaval 2026
    expect(feriados(2026)['2026-04-03']).toBe('Paixão de Cristo');
  });
});

describe('nomes', () => {
  it('ignora "(RM2-Md)", acentos e caixa', () => {
    expect(chaveNome('1T (RM2-Md) COSTA')).toBe(chaveNome('1t costa'));
    expect(chaveNome('CT JÚLIO CÉSAR')).toBe('CT JULIO CESAR');
    expect(nomeExibicao('1T (RM2-Md) KILDARE')).toBe('1T KILDARE');
  });
});

describe('lerCsvEscala', () => {
  it('modelo simplificado (;) agrupa por dia', () => {
    const r = lerCsvEscala('DATA;SERVICO;MEDICOS;RETEM\n06/11/2026;Supervisão;CT NÉLIA NOGUEIRA;CT LUZ\n06/11/2026;DIA;"2T PAES, 2T RUFINO";1T GUIMARÃES\n06/11/2026;NOITE;"1T OLIVEIRA, 1T KILDARE";2T RUFINO\n31/02/2026;DIA;X;\n07/11/2026;PLANTÃO;X;\n');
    expect(r.dias).toEqual([{ data: '2026-11-06', supervisor: 'CT NÉLIA NOGUEIRA', retemSupervisao: 'CT LUZ', dia: ['2T PAES', '2T RUFINO'], retemDia: '1T GUIMARÃES', noite: ['1T OLIVEIRA', '1T KILDARE'], retemNoite: '2T RUFINO' }]);
    expect(r.erros.map(e => e.linha)).toEqual([5, 6]);
    expect(r.meses).toEqual(['2026-11']);
  });
  it('aceita o CSV exportado da aba Agenda', () => {
    const csv = 'Início,Término,SVC,Medico,Retens,Título,Dia Inteiro?\n01/02/2026,02/02/2026,DIA,"1T (RM2-Md) COSTA, 1T SANTIAGO",1T (RM2-Md) KILDARE,x,TRUE\n01/03/2026,02/03/2026,Supervisão,CT SEIXAS,CT JÚLIO CÉSAR,"✅ Supervisão: CT SEIXAS",TRUE\n';
    const r = lerCsvEscala(csv);
    expect(r.erros).toEqual([]);
    expect(r.dias).toEqual([
      { data: '2026-02-01', dia: ['1T (RM2-Md) COSTA', '1T SANTIAGO'], retemDia: '1T (RM2-Md) KILDARE' },
      { data: '2026-03-01', supervisor: 'CT SEIXAS', retemSupervisao: 'CT JÚLIO CÉSAR' },
    ]);
  });
  it('normaliza espaços nos nomes (convenção 19.3)', () => {
    const r = lerCsvEscala('DATA;SERVICO;MEDICOS;RETEM\n01/12/2026;DIA;"  1T   KILDARE ,  1T OLIVEIRA ";  CT  LUZ \n');
    expect(r.dias[0].dia).toEqual(['1T KILDARE', '1T OLIVEIRA']);
    expect(r.dias[0].retemDia).toBe('CT LUZ');
  });
  it('cabeçalho sem colunas obrigatórias', () => {
    expect(() => lerCsvEscala('foo;bar\n1;2')).toThrow(/DATA/);
  });
});

describe('serviços do usuário', () => {
  const dias = [
    { data: '2026-11-07', supervisor: 'CT MAURISTON', retemSupervisao: '1T VALÉRIA', dia: ['2T MARINHO', '2T RUFINO'] },
    { data: '2026-11-06', noite: ['1T (RM2-Md) OLIVEIRA', '1T KILDARE'], retemDia: '1T OLIVEIRA' },
  ];
  it('lista em ordem e decide a face inicial', () => {
    expect(servicosDoUsuario(dias, '1T OLIVEIRA')).toEqual([{ data: '2026-11-06', funcao: 'Retém dia' }, { data: '2026-11-06', funcao: 'Noite' }]);
    expect(servicosDoUsuario(dias, 'CT MAURISTON')).toEqual([{ data: '2026-11-07', funcao: 'Supervisão' }]);
    expect(faceInicial(dias, '1T OLIVEIRA')).toBe('plantao');
    expect(faceInicial(dias, 'CT MAURISTON')).toBe('supervisao');
    expect(faceInicial(dias, 'NINGUEM')).toBe('supervisao');
  });
});
