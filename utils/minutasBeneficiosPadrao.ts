// Ficheiro: utils/minutasBeneficiosPadrao.ts
// Padrão das minutas de resultado de IS finalidade Benefícios (catálogo 12 a 23; utils/catalogoMinutasMSG.ts).
// Todas têm a mesma estrutura:
//   DE (remetente) · PARA/INFO (por beneficiário) · ASSUNTO fixo "RESULTADO DE IS FIM CONCESSÃO DE BENEFÍCIOS - {inspecionado}"
//   abertura:  "{data-hora APS}, PTC JRS/HNRe concluiu em {data}, IS FIM Concessão de Benefícios {qualificação do inspecionado}, e:"
//   ALFA:      "exarou o seguinte laudo: “{frases do laudo}”, ACD TIS nº {tis}; e"
//   BRAVO:     verificação digital do TIS (DS-1A)
// O que varia é só (a) o beneficiário (define PARA/INFO, alíneas e a qualificação) e (b) enquadra × não enquadra (define as frases do laudo).
// Exceção: militar inativo ENQUADRADO não tem minuta de resultado — usa a nº 19 (solicitação de autorização de auxílio-invalidez).
// Este módulo só decide minuta, destinatários e frases; o texto vem do catálogo editável. Ainda sem gatilho no app.

export type BeneficiarioBeneficios =
  | 'militar_inativo_cfn' | 'almirante_inativo' | 'militar_inativo'
  | 'pensionista' | 'servidor_civil_inativo' | 'pensao_invalido' | 'dependencia_familiar';

export interface RegraBeneficios {
  beneficiario: BeneficiarioBeneficios;
  rotulo: string;
  /** Alíneas da DGPM-406 (9ª Rev) que fundamentam o resultado. */
  norma: string;
  para: string;
  info: string;
  /** Nº da minuta do catálogo (por enquadramento). */
  minutaNao: number;
  minutaSim: number;
}

export const REGRAS_BENEFICIOS: RegraBeneficios[] = [
  { beneficiario: 'militar_inativo_cfn', rotulo: 'Militar inativo do CFN (inclui almirantes)', norma: 'inciso 9.1.6, alíneas “a”, “g”, “h”, “i” e “k”', para: 'PESCFN', info: 'SVCVPM', minutaNao: 12, minutaSim: 19 },
  { beneficiario: 'almirante_inativo', rotulo: 'Almirante inativo (exceto CFN)', norma: 'inciso 9.1.6, alíneas “a”, “g”, “h”, “i” e “k”', para: 'PESMAR', info: 'SVCVPM', minutaNao: 13, minutaSim: 19 },
  { beneficiario: 'militar_inativo', rotulo: 'Militar inativo (exceto almirante e CFN)', norma: 'inciso 9.1.6, alíneas “a”, “g”, “h”, “i” e “k”', para: 'SVCVPM', info: 'PESMAR', minutaNao: 14, minutaSim: 19 },
  { beneficiario: 'pensionista', rotulo: 'Pensionista', norma: 'inciso 9.1.6, alíneas “g” e “i”', para: 'SVCVPM', info: '', minutaNao: 15, minutaSim: 16 },
  { beneficiario: 'servidor_civil_inativo', rotulo: 'Servidor civil inativo', norma: 'inciso 10.16.4, alíneas “f” e “g”', para: 'DPMBSB', info: 'SVCVPM', minutaNao: 18, minutaSim: 17 },
  { beneficiario: 'pensao_invalido', rotulo: 'Pensão militar para beneficiário inválido', norma: 'inciso 9.1.2, alínea “a”', para: 'DPMBSB', info: 'SVCVPM ou OM que APS', minutaNao: 21, minutaSim: 20 },
  { beneficiario: 'dependencia_familiar', rotulo: 'Dependência de familiar de militar', norma: 'inciso 9.1.6, alínea “f”', para: 'DPMBSB', info: 'SVCVPM ou OM que APS', minutaNao: 23, minutaSim: 22 },
];

/** Nº da minuta do catálogo e destinatários para (beneficiário × enquadramento). */
export const minutaBeneficios = (b: BeneficiarioBeneficios, enquadra: boolean): { minuta: number; para: string; info: string; norma: string } => {
  const r = REGRAS_BENEFICIOS.find(x => x.beneficiario === b)!;
  // Militar inativo enquadrado: solicitação de auxílio-invalidez ao Órgão de Pessoal (INFO SVCVPM), não resultado ao SVCVPM/PES.
  if (enquadra && r.minutaSim === 19) return { minuta: 19, para: '{{orgao_pessoal}}', info: 'SVCVPM', norma: 'inciso 9.1.2, alínea “a”' };
  return { minuta: enquadra ? r.minutaSim : r.minutaNao, para: r.para, info: r.info, norma: r.norma };
};

/** Frases do laudo do militar inativo (12–14): cada uma entra conforme a finalidade da IS e o laudo exarado. */
export interface FrasesMilitarInativo {
  internacao?: boolean;      // não necessita de internação permanente / cuidados permanentes de enfermagem
  doencaLei?: boolean;       // não apresenta histórico de doença especificada em lei
  incapacidadeSam?: boolean; // não apresenta critérios de incapacidade definitiva para o SAM
  doencaGrave?: boolean;     // não foi verificada doença grave especificada em lei
  invalidez?: boolean;       // não está inválido
}
export const frasesLaudoMilitarInativo = (f: FrasesMilitarInativo): string => {
  const partes: string[] = [];
  if (f.internacao) partes.push('(Não necessita de internação permanente. Não necessita de assistência ou cuidados permanentes de enfermagem).');
  if (f.doencaLei) partes.push('(Não apresenta histórico de doença especificada na Lei nº 7.713/1988, alterada pelas Leis nº 8.541/1992 e 9.250/1995 e 11.052/2004.)');
  if (f.incapacidadeSam) partes.push('(Não apresenta critérios de incapacidade definitiva para o SAM na presente data.)');
  if (f.doencaGrave) partes.push('(Não foi verificada doença grave especificada em Lei na presente data.)');
  if (f.invalidez) partes.push('(Não está inválido na presente data.)');
  return partes.join(' ');
};
