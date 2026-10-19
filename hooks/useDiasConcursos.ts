// Ficheiro: hooks/useDiasConcursos.ts
// Dias agendados dos concursos Em andamento / Em breve (tempo real) e a sincronização deles com o Google Agenda
// "JRS/HNRe". Ver services/agendaConcursos.ts.
import { useEffect, useState } from 'react';
import { observarDiasConcursos, assinaturaDias, sincronizarConcursosNaAgenda, carregarConvidadosAgenda, type DiaConcurso } from '../services/agendaConcursos';

const CHAVE_ASSINATURA = 'jrs_agenda_concursos_assinatura';

/** Assina os dias de concurso; `concursosAtivos` é null até todos os candidatos terem carregado. */
export const useDiasConcursos = (ativo: boolean = true) => {
  const [dias, setDias] = useState<DiaConcurso[]>([]);
  const [concursosAtivos, setConcursosAtivos] = useState<string[] | null>(null);
  useEffect(() => {
    if (!ativo) return;
    return observarDiasConcursos((d, a) => { setDias(d); setConcursosAtivos(a); }, () => { /* silencioso */ });
  }, [ativo]);
  return { dias, concursosAtivos };
};

/**
 * Mantém o Google Agenda em dia: quando o conteúdo dos dias de concurso muda (assinatura guardada neste navegador),
 * espera 2,5 s (junta edições em sequência) e envia tudo ao Apps Script, que cria/atualiza/remove os eventos.
 */
export const useSincronizarAgendaConcursos = (
  habilitado: boolean, dias: DiaConcurso[], concursosAtivos: string[] | null, onErro?: (mensagem: string) => void,
) => {
  // Convidados: usuários ativos do appweb (Gmail). Só sincroniza depois de carregados, para não remover convidados por engano.
  const [convidados, setConvidados] = useState<string[] | null>(null);
  useEffect(() => {
    if (!habilitado) return;
    let vivo = true;
    carregarConvidadosAgenda().then(l => { if (vivo) setConvidados(l); }).catch(() => { /* sem convidados: não sincroniza */ });
    return () => { vivo = false; };
  }, [habilitado]);

  useEffect(() => {
    if (!habilitado || concursosAtivos === null || convidados === null) return;
    const assinatura = assinaturaDias(dias, concursosAtivos, convidados);
    let anterior: string | null = null;
    try { anterior = localStorage.getItem(CHAVE_ASSINATURA); } catch { /* sem localStorage */ }
    if (anterior === assinatura) return;
    const t = window.setTimeout(() => {
      sincronizarConcursosNaAgenda(dias, concursosAtivos, convidados)
        .then(() => { try { localStorage.setItem(CHAVE_ASSINATURA, assinatura); } catch { /* ignora */ } })
        .catch(e => onErro?.(`Google Agenda: não foi possível atualizar os dias de concurso (${e?.message || 'erro'}).`));
    }, 2500);
    return () => window.clearTimeout(t);
  }, [habilitado, dias, concursosAtivos, convidados]); // eslint-disable-line react-hooks/exhaustive-deps
};
