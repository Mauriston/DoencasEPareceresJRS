// Ficheiro: hooks/useOcultarAoRolar.ts
// Barra inferior do celular (auditoria v3, 4e): oculta ao rolar para baixo e volta ao rolar
// para cima. Observa o MESMO contêiner de rolagem que alimenta a sombra da topbar (`rolou`,
// o <main id="conteudo"> do shell), com listener passivo + requestAnimationFrame.
//
// Mostrar: no topo (< 56 px), ao rolar para cima ≥ 8 px, no fim da página, ao trocar de rota
// (`chaveRota`) e quando `mostrar()` é chamado (ex.: um item da barra recebe foco).
// Ocultar: ao rolar para baixo ≥ 8 px ACUMULADOS no mesmo sentido (o "quique" do iOS não pisca)
// e com o teclado virtual aberto (visualViewport bem menor que a janela).
// Páginas curtas (sem rolagem) e telas com sheet/drawer/diálogo aberto não mexem na barra.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { decidirVisibilidade, type EstadoRolagem } from '../utils/ocultarAoRolar';

/** Diferença entre a janela e o visualViewport a partir da qual consideramos o teclado aberto. */
const LIMIAR_TECLADO_PX = 150;

/** Algum sheet, drawer ou diálogo modal aberto (Drawer/Dialog do DS usam aria-modal). */
const haSobreposicaoAberta = () => typeof document !== 'undefined' && !!document.querySelector('[aria-modal="true"]');

interface Opcoes {
  /** Desligado (desktop, sem barra): sempre visível e sem listeners. */
  ativo: boolean;
  /** Muda a cada troca de rota: a barra reaparece. */
  chaveRota: string;
  /** Algo do shell que deve congelar a barra (ex.: drawer do menu aberto). */
  congelado?: boolean;
}

export const useOcultarAoRolar = (alvo: RefObject<HTMLElement | null>, { ativo, chaveRota, congelado = false }: Opcoes) => {
  const [rolagemVisivel, setRolagemVisivel] = useState(true);
  const [tecladoAberto, setTecladoAberto] = useState(false);
  const estado = useRef<EstadoRolagem>({ ultimoY: 0, acumulado: 0 });
  const congeladoRef = useRef(congelado);
  congeladoRef.current = congelado;

  // Troca de rota: mostra e zera o acumulado (o shell já leva o <main> ao topo).
  useEffect(() => {
    estado.current = { ultimoY: alvo.current?.scrollTop ?? 0, acumulado: 0 };
    setRolagemVisivel(true);
  }, [chaveRota, alvo]);

  useEffect(() => {
    const el = alvo.current;
    if (!ativo || !el) { setRolagemVisivel(true); return; }
    let quadro = 0;
    const processar = () => {
      quadro = 0;
      const medidas = { y: Math.max(0, el.scrollTop), alturaVisivel: el.clientHeight, alturaTotal: el.scrollHeight };
      if (congeladoRef.current || haSobreposicaoAberta()) {
        // Não mexe na barra, mas acompanha a posição para não "saltar" ao fechar.
        estado.current = { ultimoY: medidas.y, acumulado: 0 };
        return;
      }
      const r = decidirVisibilidade(estado.current, medidas);
      estado.current = r.estado;
      if (r.visivel !== null) setRolagemVisivel(r.visivel);
    };
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(processar); };
    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      el.removeEventListener('scroll', aoRolar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [ativo, alvo]);

  // Teclado virtual aberto (iOS/Android): o visualViewport encolhe bem mais que a janela.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!ativo || !vv) { setTecladoAberto(false); return; }
    const medir = () => setTecladoAberto(window.innerHeight - vv.height > LIMIAR_TECLADO_PX);
    medir();
    vv.addEventListener('resize', medir);
    return () => vv.removeEventListener('resize', medir);
  }, [ativo]);

  const mostrar = useCallback(() => {
    estado.current = { ...estado.current, acumulado: 0 };
    setRolagemVisivel(true);
  }, []);

  return { visivel: !ativo || (rolagemVisivel && !tecladoAberto), mostrar };
};
