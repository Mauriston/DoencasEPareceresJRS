// Ficheiro: components/painel/periodo.ts
// Faixa de destaque do período selecionado nos gráficos mensais (índices dos meses da série dentro da janela).
import type { JanelaPainel, PontoSerie } from '../../utils/painel';

export const destaqueDaJanela = (serie: PontoSerie[], janela: JanelaPainel): [number, number] | undefined => {
  const mesIni = janela.atual.inicio.slice(0, 7);
  const idx = serie.map((p, i) => (p.chave >= mesIni ? i : -1)).filter(i => i >= 0);
  // Série inteira dentro do período (12 meses): sem faixa, nada a destacar.
  if (!idx.length || idx.length === serie.length) return undefined;
  return [idx[0], idx[idx.length - 1]];
};
