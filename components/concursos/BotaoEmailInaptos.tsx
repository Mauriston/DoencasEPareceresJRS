// Ficheiro: components/concursos/BotaoEmailInaptos.tsx
// Botão primário "+ Email Inaptos" no cabeçalho da página do concurso (à direita; só concurso Em andamento,
// só Admin e Secretaria). Badge = candidatos INAPTO com o e-mail ainda não enviado; sem pendências, fica
// desabilitado. O clique abre a seleção múltipla dos pendentes (todos marcados) e envia o e-mail
// "{concurso} - Candidatos Inaptos" (servidor/email/inaptosConcurso.ts).
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import type { CandidatoRecord, ConcursoRecord } from '../../services/firestoreConcursos';
import { enviarEmailInaptosConcurso } from '../../services/emailInaptosConcurso';
import { concursoAceitaEmailInaptos, dataBrCurta, inaptoPendente } from '../../utils/emailInaptosConcurso';

interface Props {
  concurso: Pick<ConcursoRecord, 'id' | 'nome' | 'status'>;
  candidatos: CandidatoRecord[];
  perfil?: string;
  onAviso: (msg: string) => void;
}

export const BotaoEmailInaptos: React.FC<Props> = ({ concurso, candidatos, perfil, onAviso }) => {
  const pendentes = useMemo(
    () => candidatos.filter(inaptoPendente).sort((a, b) => a.dataAgendamento.localeCompare(b.dataAgendamento) || a.nome.localeCompare(b.nome, 'pt-BR')),
    [candidatos],
  );
  const [aberto, setAberto] = useState(false);
  if (!(perfil === 'admin' || perfil === 'user_secretaria') || !concursoAceitaEmailInaptos(concurso.status)) return null;
  return (
    <>
      <span className="relative inline-flex">
        <Button
          icon="add" disabled={pendentes.length === 0} onClick={() => setAberto(true)}
          aria-label={`Email Inaptos (EAMPE)${pendentes.length ? ` — ${pendentes.length} pendente${pendentes.length > 1 ? 's' : ''}` : ''}`}
        >
          Email Inaptos
        </Button>
        {pendentes.length > 0 && (
          <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-wine text-white text-xs font-bold leading-5 text-center ring-2 ring-white">
            {pendentes.length > 99 ? '99+' : pendentes.length}
          </span>
        )}
      </span>
      {aberto && (
        <DialogEmailInaptos
          concurso={concurso} pendentes={pendentes}
          onClose={() => setAberto(false)}
          onEnviado={msg => { setAberto(false); onAviso(msg); }}
        />
      )}
    </>
  );
};

const DialogEmailInaptos: React.FC<{
  concurso: Pick<ConcursoRecord, 'id' | 'nome'>;
  pendentes: CandidatoRecord[];
  onClose: () => void;
  onEnviado: (msg: string) => void;
}> = ({ concurso, pendentes, onClose, onEnviado }) => {
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(pendentes.map(c => c.id)));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const todos = pendentes.length > 0 && pendentes.every(c => marcados.has(c.id));
  const alternar = (id: string) => setMarcados(m => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const enviar = async () => {
    const ids = pendentes.filter(c => marcados.has(c.id)).map(c => c.id);
    if (!ids.length) { setErro('Selecione ao menos um candidato.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarEmailInaptosConcurso(concurso.id, ids);
      onEnviado(`E-mail de inaptos enviado à EAMPE (${r.enviados} candidato${r.enviados === 1 ? '' : 's'}).`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title="E-mail de inaptos (EAMPE)" icon="forward_to_inbox" size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} disabled={marcados.size === 0} onClick={enviar}>Enviar e-mail</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-3">Candidatos <strong className="text-ink">INAPTO</strong> do {concurso.nome} ainda não comunicados à Divisão de Apoio aos Concursos da EAMPE. Assunto: “{concurso.nome} - Candidatos Inaptos”.</p>
        <label className="flex items-center gap-3 min-h-[44px] text-sm font-semibold text-ink cursor-pointer">
          <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={todos}
            onChange={() => setMarcados(todos ? new Set() : new Set(pendentes.map(c => c.id)))} />
          {todos ? 'Desmarcar todos' : 'Marcar todos'} ({marcados.size} de {pendentes.length})
        </label>
        <ul className="max-h-72 overflow-y-auto rounded-xl border border-line divide-y divide-line">
          {pendentes.map(c => (
            <li key={c.id}>
              <label className="flex items-center gap-3 min-h-[44px] px-3 py-2 text-sm cursor-pointer hover:bg-thead">
                <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={marcados.has(c.id)} onChange={() => alternar(c.id)} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-ink truncate">{c.nome}</span>
                  <span className="block text-xs text-ink-3">Matrícula {c.id} · IS em {dataBrCurta(c.dataAgendamento) || '—'}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
