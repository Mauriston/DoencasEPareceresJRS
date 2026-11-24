// Ficheiro: components/shell/LaunchScreen.tsx
// Tela de abertura do app: a 1ª coisa que aparece sempre que o app é acessado —
// Raiz.tsx a usa como fallback do Suspense enquanto o chunk do App carrega, e
// App.tsx a usa enquanto o Firebase Auth resolve a sessão (authLoading) e
// enquanto as permissões do usuário chegam (permissoesLoading). Essa espera
// soma pouco mais de 2 s na maioria dos acessos.
//
// Minimalista de propósito: só o brasão da JRS/HNRe sobre o navy, sem
// spinner, texto ou "toque para continuar" (isso é o Splash do Login,
// components/Login.tsx, que só aparece no 1º acesso do aparelho). Depois da
// entrada suave (fade + leve escala), o brasão só "respira" no lugar —
// escala e opacidade, sem deslocamento (icone-respirar, styles/app.css,
// ciclo de 1.8 s: mais de um ciclo cabe na espera).
import React, { useEffect, useState } from 'react';
import iconeJrs from '../../assets/icone-jrs.png';

// Tempo mínimo (ms, contado desde a abertura da página) em que a tela de abertura
// permanece visível, mesmo que auth/permissões resolvam antes.
export const TEMPO_MINIMO_ABERTURA_MS = 2500;

export function useAberturaConcluida(minimoMs = TEMPO_MINIMO_ABERTURA_MS): boolean {
  const restante = () => Math.max(0, minimoMs - performance.now());
  const [concluida, setConcluida] = useState(() => restante() === 0);
  useEffect(() => {
    if (concluida) return;
    const t = window.setTimeout(() => setConcluida(true), restante());
    return () => window.clearTimeout(t);
  }, [concluida]);
  return concluida;
}

const BOUNCE = 'cubic-bezier(.34,1.56,.64,1)';

export const LaunchScreen: React.FC = () => {
  // Monta já com o brasão discretamente menor/transparente e, um instante depois,
  // transiciona para o tamanho final — a mesma entrada do Splash do Login (Login.tsx),
  // só então a respiração contínua assume.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMontado(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-navy flex items-center justify-center" role="status" aria-label="Carregando o aplicativo">
      <img
        src={iconeJrs}
        alt=""
        aria-hidden="true"
        className="block object-contain splash-animado"
        style={{
          width: 112,
          height: 112,
          opacity: montado ? 1 : 0,
          transform: montado ? 'translateY(0) scale(1)' : 'translateY(24px) scale(.75)',
          transition: `opacity .5s ease, transform .8s ${BOUNCE}`,
          animation: montado ? 'icone-respirar 1.8s ease-in-out infinite' : 'none',
          filter: 'drop-shadow(0 14px 22px rgba(0,0,0,.4))',
        }}
      />
    </div>
  );
};
