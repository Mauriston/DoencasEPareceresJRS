// Ficheiro: servidor/email/examesMinimosProvisorio.ts
// PROVISÓRIO (pacote B1): mesma assinatura de `finalidadeTemExamesMinimos` de utils/guiasExames.ts (pacote A), que
// ainda não existe neste branch. Depois do merge, servidor/email/aberturaIS.ts passa a importar a função de
// utils/guiasExames.ts e este arquivo pode ser apagado.
// Regra: a finalidade está na página Exames mínimos (data/anexoOExamesMinimos.json) com ao menos um exame que gera
// guia — tudo menos Biometria, Oftalmologia geral e o Exame Toxicológico (por amostragem).
import examesData from '../../data/anexoOExamesMinimos.json';

interface GrupoFinalidadeJson {
  Finalidades_Inspecao: { Finalidade_Inspecao: string; Grupos_Exame: { Exames: { Exame: string }[] }[] }[];
}

const norma = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const SEM_GUIA = /^(biometria|oftalmologia geral)$|toxicolog/;

export const finalidadeTemExamesMinimos = (finalidade: string): boolean => {
  const alvo = norma(finalidade);
  if (!alvo) return false;
  return (examesData as unknown as GrupoFinalidadeJson[]).some(g => g.Finalidades_Inspecao.some(f =>
    norma(f.Finalidade_Inspecao) === alvo && f.Grupos_Exame.some(ge => ge.Exames.some(e => !SEM_GUIA.test(norma(e.Exame))))));
};
