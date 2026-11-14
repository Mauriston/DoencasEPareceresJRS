// Ficheiro: components/administracao/BarraSalvar.tsx
// Barra de salvar única das subpáginas da Administração (auditoria v3, 8b — CF2). Aparece só com alterações,
// fixa no pé da área visível (acima da barra inferior do celular), com o resumo do que mudou; "Revisar e
// salvar" abre a diferença (antes → depois) e só então grava. Saída com pendências: useAvisoSaida.
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { NoCorpo } from './NoCorpo';

export interface LinhaDiferenca {
  /** O que mudou (ex.: "User Médicos · Inspeções de Saúde › Cadastrar nova IS"). */
  rotulo: string;
  antes?: string;
  depois: string;
}

interface BarraSalvarProps {
  /** Resumo de uma linha (ex.: "1 alteração em User Médicos: … · afeta 8 usuários"). */
  resumo: string;
  /** Diferença mostrada em "Revisar e salvar". Vazia = sem alterações (a barra some). */
  diferencas: LinhaDiferenca[];
  onDescartar: () => void;
  onSalvar: () => Promise<boolean | void> | boolean | void;
  salvando?: boolean;
  /** Erro que impede salvar (ex.: campo obrigatório vazio). */
  bloqueio?: string;
  /** Texto extra no diálogo de revisão (ex.: quando a mudança passa a valer). */
  aviso?: string;
}

export const BarraSalvar: React.FC<BarraSalvarProps> = ({ resumo, diferencas, onDescartar, onSalvar, salvando = false, bloqueio, aviso }) => {
  const [revisando, setRevisando] = useState(false);
  if (!diferencas.length) return null;

  const confirmar = async () => {
    const ok = await onSalvar();
    if (ok !== false) setRevisando(false);
  };

  return (
    <>
      <div
        role="region"
        aria-label="Alterações não salvas"
        className="sticky z-sticky mt-6 -mx-4 md:mx-0 bg-white border-t md:border border-line md:rounded-xl shadow-lg px-4 py-3 flex flex-col md:flex-row md:items-center gap-3"
        style={{ bottom: 'calc(var(--tabbar-h, 0px) + 0.5rem)' }}
      >
        <p className="flex-1 min-w-0 flex items-start gap-2 text-sm text-ink" aria-live="polite">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-gold shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            {resumo}
            {bloqueio && <span role="alert" className="block text-xs font-semibold text-wine mt-0.5">{bloqueio}</span>}
          </span>
        </p>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onDescartar} disabled={salvando}>Descartar</Button>
          <Button icon="save" onClick={() => setRevisando(true)} disabled={!!bloqueio} loading={salvando}>Revisar e salvar</Button>
        </div>
      </div>
      {revisando && (
        <NoCorpo>
          <Dialog
            title="Revisar alterações"
            icon="fact_check"
            size="lg"
            onClose={() => { if (!salvando) setRevisando(false); }}
            footer={(
              <>
                <Button variant="secondary" onClick={() => setRevisando(false)} disabled={salvando}>Voltar</Button>
                <Button icon="save" onClick={confirmar} loading={salvando}>Salvar {diferencas.length === 1 ? 'alteração' : `${diferencas.length} alterações`}</Button>
              </>
            )}
          >
            <p className="mb-3">{resumo}</p>
            <div className="rounded-lg border border-line overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-thead text-xs font-semibold text-ink-3">
                  <tr>
                    <th scope="col" className="px-3 py-2">O que muda</th>
                    <th scope="col" className="px-3 py-2">Antes</th>
                    <th scope="col" className="px-3 py-2">Depois</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {diferencas.map((d, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-3 py-2 text-ink break-words">{d.rotulo}</td>
                      <td className="px-3 py-2 text-ink-3 break-words">{d.antes ?? '—'}</td>
                      <td className="px-3 py-2 font-semibold text-navy break-words">{d.depois}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {aviso && <p className="text-xs text-ink-3 mt-3">{aviso}</p>}
          </Dialog>
        </NoCorpo>
      )}
    </>
  );
};
