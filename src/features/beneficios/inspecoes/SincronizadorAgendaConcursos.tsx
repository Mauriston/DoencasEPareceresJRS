// Ficheiro: components/inspecoes/SincronizadorAgendaConcursos.tsx
// Sem interface: mantém a agenda "JRS/HNRe" do Google Agenda em dia com os dias de concurso enquanto quem pode agendar
// está com o app aberto em QUALQUER página (a página Inspeções de Saúde faz a mesma sincronização com aviso de erro,
// por isso este componente fica desligado nela).
import React from 'react';
import { useDiasConcursos, useSincronizarAgendaConcursos } from '@/hooks/useDiasConcursos';

export const SincronizadorAgendaConcursos: React.FC<{ ativo: boolean }> = ({ ativo }) => {
  const { dias, concursosAtivos } = useDiasConcursos(ativo);
  useSincronizarAgendaConcursos(ativo, dias, concursosAtivos);
  return null;
};
