// Ficheiro: utils/limitePdf.ts
// Regra do limite de tamanho do PDF digitalizado (components/scanner/ScannerDocumento.tsx): gera o PDF, MEDE o
// Blob e, se passar do limite, recomprime as páginas em níveis cada vez mais leves (lado máximo e qualidade do
// JPEG) até caber — sem descer abaixo do piso de legibilidade para a IA. Se nem o nível mais leve couber, devolve
// excede = true (a tela bloqueia "Adicionar página" e "Usar"). Sem DOM: gerar e recomprimir são injetados.
import { LIMITE_PDF_BYTES } from '../config/limitePdf';

export interface NivelCompressao { lado: number; qualidade: number }

/**
 * Níveis tentados em ordem. O 1º é o padrão das páginas (utils/filtroDocumento.ts gera 1800 px / 0,85).
 * Piso: 1200 px no lado maior e qualidade 0,6 — abaixo disso a letra manuscrita começa a borrar para a IA.
 */
export const NIVEIS_COMPRESSAO: NivelCompressao[] = [
  { lado: 1800, qualidade: 0.85 },
  { lado: 1600, qualidade: 0.75 },
  { lado: 1400, qualidade: 0.68 },
  { lado: 1200, qualidade: 0.6 },
];

export interface ResultadoLimite {
  pdf: Blob;
  /** Páginas efetivamente usadas no PDF (originais ou recomprimidas). */
  paginas: string[];
  /** Índice do nível usado (0 = sem recompressão). */
  nivel: number;
  bytes: number;
  excede: boolean;
}

export interface DependenciasLimite {
  gerarPdf: (paginas: string[]) => Promise<Blob>;
  recomprimir: (pagina: string, nivel: NivelCompressao) => Promise<string>;
}

export const ajustarAoLimite = async (
  paginas: string[],
  dep: DependenciasLimite,
  limiteBytes: number = LIMITE_PDF_BYTES,
  niveis: NivelCompressao[] = NIVEIS_COMPRESSAO,
): Promise<ResultadoLimite> => {
  if (!paginas.length) throw new Error('Nenhuma página para o PDF.');
  let pdf = await dep.gerarPdf(paginas);
  if (pdf.size < limiteBytes) return { pdf, paginas, nivel: 0, bytes: pdf.size, excede: false };
  let atuais = paginas;
  for (let i = 1; i < niveis.length; i++) {
    atuais = await Promise.all(paginas.map(p => dep.recomprimir(p, niveis[i])));
    pdf = await dep.gerarPdf(atuais);
    if (pdf.size < limiteBytes) return { pdf, paginas: atuais, nivel: i, bytes: pdf.size, excede: false };
  }
  return { pdf, paginas: atuais, nivel: niveis.length - 1, bytes: pdf.size, excede: true };
};

/** Recompressão real (navegador): redimensiona para o lado máximo e regrava o JPEG na qualidade do nível. */
export const recomprimirJpeg = (pagina: string, nivel: NivelCompressao): Promise<string> => new Promise((ok, erro) => {
  const img = new Image();
  img.onload = () => {
    const escala = Math.min(1, nivel.lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * escala));
    c.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = c.getContext('2d');
    if (!ctx) { ok(pagina); return; }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ok(c.toDataURL('image/jpeg', nivel.qualidade));
  };
  img.onerror = () => erro(new Error('Não foi possível recomprimir a página.'));
  img.src = pagina;
});
