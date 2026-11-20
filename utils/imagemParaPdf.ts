// Ficheiro: utils/imagemParaPdf.ts
// Converte a foto do atestado (data URL JPEG/PNG) em um PDF A4 de uma página — atalho de imagensParaPdf.
import { imagensParaPdf } from './imagensParaPdf';

export const imagemParaPdf = (imagemDataUrl: string): Promise<Blob> => imagensParaPdf([imagemDataUrl]);
