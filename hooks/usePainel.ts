// Ficheiro: hooks/usePainel.ts
// Dados do Painel por seção: lê (uma vez, sem listener) só as seções que o perfil vê e só a partir da data que
// o período exige (utils/painel.ts → inicioDaLeitura). Trocar para um período mais curto reaproveita o que já
// foi lido; um período mais longo relê a partir da nova data. "Atualizar" relê tudo.
import { useCallback, useEffect, useRef, useState } from 'react';
import { lerConcursosPainel, lerInspecoesPainel, lerPericiasPainel } from '../services/painelDados';
import { listarUsoDiario, podarUsoAntigo } from '../services/usoDiario';
import { listUsuarios } from '../services/firestoreUsuarios';
import type { ConcursoPainel, ISPainel, PericiaPainel, UsoDia, UsuarioUso } from '../utils/painel';

export type SecaoPainel = 'inspecoes' | 'pericias' | 'concursos' | 'uso';

export interface EstadoSecao<T> { dados: T | null; carregando: boolean; erro: string }

export interface DadosPainel {
  inspecoes: EstadoSecao<ISPainel[]>;
  pericias: EstadoSecao<PericiaPainel[]>;
  concursos: EstadoSecao<ConcursoPainel[]>;
  uso: EstadoSecao<{ dias: UsoDia[]; usuarios: UsuarioUso[] }>;
  atualizadoEm: number | null;
  atualizar: () => void;
}

const vazio = <T,>(): EstadoSecao<T> => ({ dados: null, carregando: false, erro: '' });

const leitores: Record<SecaoPainel, (inicio: string, hoje: string) => Promise<unknown>> = {
  inspecoes: inicio => lerInspecoesPainel(inicio),
  pericias: inicio => lerPericiasPainel(inicio),
  concursos: inicio => lerConcursosPainel(inicio),
  uso: async (inicio, hoje) => {
    podarUsoAntigo().catch(() => { /* retenção best effort */ });
    const [dias, usuarios] = await Promise.all([listarUsoDiario(inicio, hoje), listUsuarios()]);
    return { dias, usuarios: usuarios.map(u => ({ uid: u.id, usuario: u.usuario, perfil: u.perfil, ativo: !!u.ativo })) };
  },
};

const MENSAGEM_ERRO = 'Não foi possível carregar estes dados. Tente Atualizar.';

export const usePainel = (secoes: SecaoPainel[], inicio: string, hoje: string): DadosPainel => {
  const [estado, setEstado] = useState<Record<SecaoPainel, EstadoSecao<any>>>({ inspecoes: vazio(), pericias: vazio(), concursos: vazio(), uso: vazio() });
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [geracao, setGeracao] = useState(0);
  /** Data desde a qual cada seção já foi lida (para reaproveitar em períodos mais curtos). */
  const lidoDesde = useRef<Partial<Record<SecaoPainel, string>>>({});
  const chaveSecoes = secoes.join(',');

  useEffect(() => {
    let cancelado = false;
    const pendentes = secoes.filter(s => !lidoDesde.current[s] || lidoDesde.current[s]! > inicio);
    if (!pendentes.length) return;
    setEstado(e => ({ ...e, ...Object.fromEntries(pendentes.map(s => [s, { ...e[s], carregando: true, erro: '' }])) }));
    Promise.all(pendentes.map(s => leitores[s](inicio, hoje)
      .then(dados => { if (!cancelado) { lidoDesde.current[s] = inicio; setEstado(e => ({ ...e, [s]: { dados, carregando: false, erro: '' } })); } })
      .catch(() => { if (!cancelado) setEstado(e => ({ ...e, [s]: { ...e[s], carregando: false, erro: MENSAGEM_ERRO } })); })))
      .then(() => { if (!cancelado) setAtualizadoEm(Date.now()); });
    return () => { cancelado = true; };
  }, [chaveSecoes, inicio, hoje, geracao]); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizar = useCallback(() => { lidoDesde.current = {}; setGeracao(g => g + 1); }, []);

  return { ...estado, atualizadoEm, atualizar } as DadosPainel;
};
