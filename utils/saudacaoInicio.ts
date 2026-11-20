// Ficheiro: utils/saudacaoInicio.ts
// Saudação do topo da Início no celular (Médicos Geral): "PAES, bom dia!" — o nome de guerra do usuário (sem o
// posto/graduação nem o quadro entre parênteses) e a saudação do momento: "bom feriado" (feriados nacionais, de PE e
// do Recife — utils/escalaSpa.ts), "bom sábado", "bom domingo"; nos dias úteis, "bom dia" / "boa tarde" / "boa noite".
import { feriados } from './escalaSpa';

/** "2T PAES" → "PAES"; "CT (Md) MAURISTON" → "MAURISTON"; "GM (RM2-S) FULANO" → "FULANO". */
export const nomeDeGuerra = (usuario?: string): string => {
  const partes = String(usuario || '').replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  return (partes.length > 1 ? partes.slice(1) : partes).join(' ').toUpperCase();
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Saudação em minúsculas para o momento `agora` (horário local do aparelho). */
export const saudacaoDoMomento = (agora: Date = new Date()): string => {
  if (feriados(agora.getFullYear())[iso(agora)]) return 'bom feriado';
  const dow = agora.getDay();
  if (dow === 6) return 'bom sábado';
  if (dow === 0) return 'bom domingo';
  const h = agora.getHours();
  return h < 12 ? 'bom dia' : h < 18 ? 'boa tarde' : 'boa noite';
};

/** "PAES, bom dia!" (sem nome: "Bom dia!"). */
export const saudacaoInicio = (usuario?: string, agora: Date = new Date()): string => {
  const nome = nomeDeGuerra(usuario);
  const s = saudacaoDoMomento(agora);
  return nome ? `${nome}, ${s}!` : `${s.charAt(0).toUpperCase()}${s.slice(1)}!`;
};
