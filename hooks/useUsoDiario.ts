// Ficheiro: hooks/useUsoDiario.ts
// Listener central de rota da medição de uso (services/usoDiario.ts): +1 acesso à página a cada troca de
// página (inclui Início e Inspeções) e o ultimoAcesso no documento do usuário
// uma vez por sessão. Falha silenciosa: sem as regras publicadas, o app segue normal.
import { useEffect, useRef } from 'react';
import { registrarUltimoAcesso, registrarUsoPagina } from '../services/usoDiario';

export const useUsoDiario = (uid: string | undefined, pagina: string): void => {
  const sessaoDe = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || !pagina || pagina === 'splash') return;
    registrarUsoPagina(uid, pagina).catch(() => { /* silencioso */ });
  }, [uid, pagina]);
  useEffect(() => {
    if (!uid || sessaoDe.current === uid) return;
    sessaoDe.current = uid;
    registrarUltimoAcesso(uid).catch(() => { /* silencioso */ });
  }, [uid]);
};
