// Ficheiro: utils/scanner/estabilidade.ts
// Regra do disparo automático do scanner (components/scanner/ScannerDocumento.tsx), sem DOM — testável.
// Dispara quando o documento ocupa boa parte do quadro, os cantos ficam parados por algumas detecções
// seguidas e a imagem está nítida. Depois de um disparo, só rearma quando o documento sai do quadro ou
// muda de posição (troca de página no modo multipágina), para não fotografar a mesma folha duas vezes.
import { area, convexo, deslocamentoMax, type Cantos } from './geometria';

export interface ConfigEstabilidade {
  /** Fração mínima do quadro ocupada pelo documento. */
  areaMin: number;
  /** Deslocamento máximo dos cantos entre detecções, como fração da diagonal do quadro. */
  tolerancia: number;
  /** Detecções estáveis seguidas para disparar. */
  quadrosEstaveis: number;
  /** Nitidez mínima (variância do Laplaciano no frame de análise). */
  nitidezMin: number;
  /** Deslocamento (fração da diagonal) que conta como "outra página" para rearmar. */
  mudancaRearme: number;
}

export const CONFIG_PADRAO: ConfigEstabilidade = {
  areaMin: 0.2,
  tolerancia: 0.02,
  quadrosEstaveis: 5,
  nitidezMin: 60,
  mudancaRearme: 0.15,
};

export interface EstadoEstabilidade {
  ultimo: Cantos | null;
  seguidos: number;
  /** false depois de um disparo, até o documento sair ou mudar. */
  armado: boolean;
  /** Cantos do último disparo (referência para o rearme). */
  disparado: Cantos | null;
}

export const ESTADO_INICIAL: EstadoEstabilidade = { ultimo: null, seguidos: 0, armado: true, disparado: null };

export type Situacao = 'procurando' | 'aproxime' | 'segure' | 'desfocado' | 'capturar' | 'aguardando-troca';

export interface Avaliacao {
  estado: EstadoEstabilidade;
  situacao: Situacao;
  /** 0–1: quanto falta para o disparo (anel de progresso). */
  progresso: number;
}

export const avaliar = (
  estado: EstadoEstabilidade,
  cantos: Cantos | null,
  nitidez: number,
  largura: number,
  altura: number,
  cfg: ConfigEstabilidade = CONFIG_PADRAO,
): Avaliacao => {
  const diag = Math.hypot(largura, altura);
  const valido = !!cantos && convexo(cantos) && area(cantos) / (largura * altura) >= cfg.areaMin;

  // Rearme: o documento saiu do quadro ou mudou bastante de posição.
  let armado = estado.armado;
  if (!armado) {
    const saiu = !cantos;
    const mudou = !!cantos && !!estado.disparado && deslocamentoMax(cantos, estado.disparado) / diag > cfg.mudancaRearme;
    if (saiu || mudou) armado = true;
  }

  if (!cantos) return { estado: { ...estado, ultimo: null, seguidos: 0, armado }, situacao: armado ? 'procurando' : 'aguardando-troca', progresso: 0 };
  if (!valido) return { estado: { ...estado, ultimo: cantos, seguidos: 0, armado }, situacao: armado ? 'aproxime' : 'aguardando-troca', progresso: 0 };
  if (!armado) return { estado: { ...estado, ultimo: cantos, seguidos: 0, armado }, situacao: 'aguardando-troca', progresso: 0 };

  const parado = !!estado.ultimo && deslocamentoMax(cantos, estado.ultimo) / diag <= cfg.tolerancia;
  const seguidos = parado ? estado.seguidos + 1 : 0;
  const nitido = nitidez >= cfg.nitidezMin;
  const progresso = Math.min(1, seguidos / cfg.quadrosEstaveis);

  if (seguidos >= cfg.quadrosEstaveis && nitido) {
    return { estado: { ultimo: cantos, seguidos: 0, armado: false, disparado: cantos }, situacao: 'capturar', progresso: 1 };
  }
  return {
    estado: { ...estado, ultimo: cantos, seguidos, armado },
    situacao: seguidos >= cfg.quadrosEstaveis && !nitido ? 'desfocado' : 'segure',
    progresso,
  };
};

export const MENSAGEM: Record<Situacao, string> = {
  procurando: 'Enquadre o documento',
  aproxime: 'Aproxime a câmera do documento',
  segure: 'Segure firme…',
  desfocado: 'Imagem tremida — segure firme',
  capturar: 'Capturando…',
  'aguardando-troca': 'Troque a página',
};
