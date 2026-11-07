// Ficheiro: servidor/entrevistas/audio.ts
// Áudio da entrevista da IS: validação de ids/caminhos, extensão pelo tipo MIME e conversão com o
// ffmpeg (FLAC mono 16 kHz, o formato que o Speech-to-Text lê sem ambiguidade). O ffmpeg roda sem
// shell (spawn com argumentos), com arquivos temporários em os.tmpdir() apagados ao final.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { caminhoAudioOriginal } from '../../config/entrevistas';

/** Ids de documentos do Firestore aceitos nas rotas (sem "/", "..", espaços ou caracteres de controle). */
export const ID_SEGURO = /^[A-Za-z0-9_-]{1,128}$/;
export const idValido = (v: unknown): v is string => typeof v === 'string' && ID_SEGURO.test(v);

/** Tipos de áudio que o celular pode enviar (MediaRecorder: webm/ogg no Android, mp4/aac no iPhone). */
const EXTENSOES_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/3gpp': '3gp',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
};
const MIME_EXTENSAO: Record<string, string> = {
  webm: 'audio/webm', ogg: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg',
  wav: 'audio/wav', '3gp': 'audio/3gpp', flac: 'audio/flac',
};
export const EXTENSOES_AUDIO = Object.freeze([...new Set(Object.values(EXTENSOES_MIME))]);

/** "audio/webm;codecs=opus" → "audio/webm" (minúsculas, sem parâmetros). */
export const mimeBase = (mime: unknown): string => String(mime ?? '').split(';')[0].trim().toLowerCase();

/** Extensão do arquivo original pelo tipo MIME, ou null se o tipo não for aceito. */
export const extensaoDoMime = (mime: unknown): string | null => EXTENSOES_MIME[mimeBase(mime)] ?? null;

/** Content-Type para devolver o original pela extensão do caminho. */
export const mimeDaExtensao = (ext: string): string => MIME_EXTENSAO[ext.toLowerCase()] || 'application/octet-stream';

/**
 * Confere que `caminho` é exatamente `entrevistas/{isId}/{entrevistaId}/original.{ext}` com uma
 * extensão aceita. Devolve a extensão ou null.
 */
export const extensaoDoCaminhoOriginal = (caminho: unknown, isId: string, entrevistaId: string): string | null => {
  if (typeof caminho !== 'string' || !idValido(isId) || !idValido(entrevistaId)) return null;
  const prefixo = caminhoAudioOriginal(isId, entrevistaId, '');
  if (!caminho.startsWith(prefixo)) return null;
  const ext = caminho.slice(prefixo.length);
  return (EXTENSOES_AUDIO as readonly string[]).includes(ext) ? ext : null;
};

export const caminhoAudioFlac = (isId: string, entrevistaId: string) => `entrevistas/${isId}/${entrevistaId}/audio.flac`;

/** Data AAAA-MM-DD em que o áudio deve ser apagado (data da entrevista + dias), em UTC. */
export const dataApagarApos = (dataEntrevista: Date, dias: number): string => {
  const d = new Date(Number.isFinite(dataEntrevista.getTime()) ? dataEntrevista.getTime() : Date.now());
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

const TEMPO_MAX_FFMPEG_MS = 10 * 60 * 1000;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

/** Roda o ffmpeg sem shell; rejeita com mensagem curta (sem o stderr, que pode conter caminhos). */
const rodarFfmpeg = (args: string[]): Promise<void> => new Promise((resolve, reject) => {
  const p = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], shell: false });
  let stderr = '';
  p.stderr.on('data', (c: Buffer) => { if (stderr.length < 2000) stderr += c.toString(); });
  const relogio = setTimeout(() => p.kill('SIGKILL'), TEMPO_MAX_FFMPEG_MS);
  p.on('error', e => { clearTimeout(relogio); reject(new Error(`ffmpeg indisponível (${(e as NodeJS.ErrnoException).code || 'erro'})`)); });
  p.on('close', (codigo, sinal) => {
    clearTimeout(relogio);
    if (codigo === 0) resolve();
    else reject(new Error(sinal ? `ffmpeg interrompido (${sinal})` : `ffmpeg falhou (código ${codigo}): ${/Invalid data|could not find codec|does not contain any stream/i.test(stderr) ? 'áudio ilegível' : 'conversão'}`));
  });
});

/**
 * Cria uma pasta temporária exclusiva, entrega à função e a apaga ao final (sucesso ou erro).
 */
export const comPastaTemporaria = async <T>(fn: (pasta: string) => Promise<T>): Promise<T> => {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), `entrevista-${randomUUID().slice(0, 8)}-`));
  try { return await fn(pasta); } finally { await fs.rm(pasta, { recursive: true, force: true }).catch(() => undefined); }
};

/** Converte `entrada` para FLAC mono 16 kHz 16 bits em `saida`. */
export const converterParaFlac = (entrada: string, saida: string): Promise<void> => rodarFfmpeg([
  '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
  '-i', entrada,
  '-vn', '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', '-c:a', 'flac',
  saida,
]);
