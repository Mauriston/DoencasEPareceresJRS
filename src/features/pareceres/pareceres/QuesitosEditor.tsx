// Ficheiro: components/pareceres/QuesitosEditor.tsx
// Modal grande e centralizado para editar a lista de quesitos: cada quesito é um
// campo de texto (pode ter várias linhas), com mover, remover e incluir. Serve tanto
// ao pedido de parecer (ajuste pontual de um pedido, com "Restaurar sugestão") quanto
// à configuração do Admin.
import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

/** Lista editável de quesitos (um campo por quesito, com mover/remover/incluir). */
export const ListaQuesitos: React.FC<{ lista: string[]; onChange: (l: string[]) => void }> = ({ lista, onChange }) => {
  const alterar = (i: number, v: string) => onChange(lista.map((q, j) => (j === i ? v : q)));
  const remover = (i: number) => onChange(lista.filter((_, j) => j !== i));
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const n = lista.slice(); [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {lista.map((q, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="shrink-0 w-7 pt-3 text-sm font-bold text-navy text-right" aria-hidden="true">{i + 1}.</span>
            <textarea
              aria-label={`Quesito ${i + 1}`} value={q} onChange={e => alterar(i, e.target.value)} rows={Math.max(2, q.split('\n').length)}
              className="flex-1 min-w-0 min-h-[44px] bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            />
            <div className="shrink-0 flex flex-col sm:flex-row">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir quesito ${i + 1}`} className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-thead disabled:opacity-30"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_upward</span></button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label={`Descer quesito ${i + 1}`} className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-thead disabled:opacity-30"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_downward</span></button>
              <button type="button" onClick={() => remover(i)} aria-label={`Remover quesito ${i + 1}`} className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-wine hover:bg-wine/10"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span></button>
            </div>
          </li>
        ))}
      </ol>
      <Button variant="secondary" icon="add" onClick={() => onChange([...lista, ''])}>Incluir quesito</Button>
    </div>
  );
};

interface Props {
  titulo: string;
  inicial: string[];
  /** Quando informado, habilita "Restaurar sugestão" (volta ao modelo da especialidade). */
  modelo?: string[];
  onCancelar: () => void;
  onSalvar: (lista: string[]) => void;
  salvarLabel?: string;
}

export const QuesitosEditor: React.FC<Props> = ({ titulo, inicial, modelo, onCancelar, onSalvar, salvarLabel = 'Usar estes quesitos' }) => {
  const [lista, setLista] = useState<string[]>(inicial.length ? inicial : ['']);
  return (
    <Dialog
      title={titulo}
      icon="checklist"
      size="xl"
      onClose={onCancelar}
      footer={(
        <>
          {modelo && <Button variant="ghost" icon="restart_alt" onClick={() => setLista(modelo.length ? modelo.slice() : [''])} className="sm:mr-auto">Restaurar sugestão</Button>}
          <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
          <Button icon="check" onClick={() => onSalvar(lista.map(q => q.trim()).filter(Boolean))}>{salvarLabel}</Button>
        </>
      )}
    >
      <ListaQuesitos lista={lista} onChange={setLista} />
    </Dialog>
  );
};
