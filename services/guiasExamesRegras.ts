// Ficheiro: services/guiasExamesRegras.ts
// TEMPORÁRIO (pacote C1): reexporta as regras das guias de exames com as MESMAS assinaturas do contrato de
// utils/guiasExames.ts (pacote A), que ainda não existe neste branch. Implementação simples lendo o Anexo O
// (data/anexoOExamesMinimos.json). Depois do merge, troque os imports deste arquivo por '../utils/guiasExames'
// e apague-o — o servidor recalcula os exames com a versão do pacote A de qualquer forma.
import examesData from '../data/anexoOExamesMinimos.json';

interface ExameAnexo { Exame: string; Condicao_Genero: 'Masculino' | 'Feminino' | null; Condicao_Idade_Minima: number | null }
interface GrupoExameAnexo { Grupo_Exame: string; Exames: ExameAnexo[] }
interface FinalidadeAnexo { Finalidade_Inspecao: string; Grupos_Exame: GrupoExameAnexo[] }
interface GrupoFinalidadeAnexo { Grupo_Finalidade_Inspecao: string; Finalidades_Inspecao: FinalidadeAnexo[] }

/** Rótulos dos grupos, na ordem das páginas. */
export const GRUPOS_GUIA = ['Exames laboratoriais', 'Avaliações', 'Exames de imagem', 'Outros exames'] as const;

const limpar = (s: string) => s.replace(/\s+/g, ' ').trim();
const chave = (s: string) => limpar(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FINALIDADES = (examesData as GrupoFinalidadeAnexo[]).flatMap(g => g.Finalidades_Inspecao);
const acharFinalidade = (nome: string) => FINALIDADES.find(f => chave(f.Finalidade_Inspecao) === chave(nome));

/** Não geram guia: Biometria e Oftalmologia geral (feitas na JRS) e o Exame toxicológico (por amostragem). */
const SEM_GUIA = new Set(['biometria', 'oftalmologia geral', 'exame toxicologico']);

/** Idade completa em anos em `hoje` (AAAA-MM-DD; padrão: hoje). */
export const idadeEm = (dataNascimento: string, hoje: string = new Date().toISOString().slice(0, 10)): number => {
  const [an, mn, dn] = dataNascimento.split('-').map(Number);
  const [ah, mh, dh] = hoje.split('-').map(Number);
  if (!an || !ah) return NaN;
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
};

/** Exames que geram guia, por grupo (ordem das páginas), para a finalidade, o sexo e a idade. */
export const examesDasGuias = (finalidade: string, sexo: 'Masculino' | 'Feminino', idade: number): { grupo: string; exames: string[] }[] => {
  const f = acharFinalidade(finalidade);
  if (!f) return [];
  return GRUPOS_GUIA.map(grupo => {
    const g = f.Grupos_Exame.find(x => x.Grupo_Exame === grupo);
    const exames = (g?.Exames ?? [])
      .filter(e => !SEM_GUIA.has(chave(e.Exame)))
      .filter(e => (e.Condicao_Genero === null || e.Condicao_Genero === sexo) && (e.Condicao_Idade_Minima === null || idade >= e.Condicao_Idade_Minima))
      .map(e => (/^teste imunologico de gravidez/.test(chave(e.Exame)) ? 'TIG' : e.Exame));
    return { grupo, exames: grupo === 'Exames laboratoriais' ? [...exames].sort((a, b) => a.localeCompare(b, 'pt-BR')) : exames };
  }).filter(g => g.exames.length > 0);
};

/** A finalidade (nome do Anexo O) tem exames que geram guia (algum sexo, alguma idade). */
export const finalidadeTemExamesMinimos = (finalidade: string): boolean =>
  examesDasGuias(finalidade, 'Masculino', 120).length > 0 || examesDasGuias(finalidade, 'Feminino', 120).length > 0;
