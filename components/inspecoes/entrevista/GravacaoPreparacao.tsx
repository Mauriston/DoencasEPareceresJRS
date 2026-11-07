// Ficheiro: components/inspecoes/entrevista/GravacaoPreparacao.tsx
// Passo 1 do fluxo de gravação da entrevista da IS: participantes (o perito logado e o inspecionado
// já vêm preenchidos), finalidade (vinda da IS, editável), consentimento obrigatório do
// inspecionado e a dica de posicionamento do celular.
import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import {
  MAX_PARTICIPANTES, MIN_PARTICIPANTES, ROTULO_PAPEL,
  type PapelParticipante, type ParticipanteEntrevista,
} from '../../../config/entrevistas';

const PAPEIS = Object.keys(ROTULO_PAPEL) as PapelParticipante[];

export interface DadosPreparacao { participantes: ParticipanteEntrevista[]; finalidade: string }

interface Props {
  inicial: DadosPreparacao;
  salvando: boolean;
  erroEnvio?: string | null;
  onAvancar: (dados: DadosPreparacao) => void;
}

export const GravacaoPreparacao: React.FC<Props> = ({ inicial, salvando, erroEnvio, onAvancar }) => {
  const [participantes, setParticipantes] = useState<ParticipanteEntrevista[]>(inicial.participantes);
  const [finalidade, setFinalidade] = useState(inicial.finalidade);
  const [consentiu, setConsentiu] = useState(false);
  const [tentou, setTentou] = useState(false);

  const alterar = (i: number, patch: Partial<ParticipanteEntrevista>) =>
    setParticipantes(ps => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const remover = (i: number) => setParticipantes(ps => ps.filter((_, j) => j !== i));
  const adicionar = () => setParticipantes(ps => (ps.length >= MAX_PARTICIPANTES ? ps : [...ps, { nome: '', papel: 'membro_junta' }]));

  const erroNome = (p: ParticipanteEntrevista) => (tentou && !p.nome.trim() ? 'Informe o nome.' : undefined);
  const erroFinalidade = tentou && !finalidade.trim() ? 'Informe a finalidade da IS.' : undefined;
  const erroConsentimento = tentou && !consentiu ? 'Sem consentimento, não é possível gravar.' : undefined;
  const qtdValida = participantes.length >= MIN_PARTICIPANTES && participantes.length <= MAX_PARTICIPANTES;

  const avancar = (e: React.FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (!qtdValida || participantes.some(p => !p.nome.trim()) || !finalidade.trim() || !consentiu) return;
    onAvancar({ participantes: participantes.map(p => ({ ...p, nome: p.nome.trim() })), finalidade: finalidade.trim() });
  };

  return (
    <form onSubmit={avancar} noValidate className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <fieldset className="space-y-3">
          <legend className="font-heading font-bold text-h3 text-navy mb-1">Participantes</legend>
          <p className="text-xs text-ink-3">De {MIN_PARTICIPANTES} a {MAX_PARTICIPANTES} pessoas.</p>
          {participantes.map((p, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink-3 uppercase tracking-label">Participante {i + 1}</p>
                {participantes.length > MIN_PARTICIPANTES && (
                  <button
                    type="button" onClick={() => remover(i)}
                    className="min-h-[44px] min-w-[44px] -my-2 -mr-2 flex items-center justify-center rounded-lg text-wine hover:bg-wine/10"
                    aria-label={`Remover participante ${i + 1}${p.nome ? ` (${p.nome})` : ''}`}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
                  </button>
                )}
              </div>
              <Field label="Nome" required error={erroNome(p)}>
                {aria => <input {...aria} type="text" autoComplete="off" value={p.nome} onChange={e => alterar(i, { nome: e.target.value })} />}
              </Field>
              <Field label="Papel">
                {aria => (
                  <select {...aria} value={p.papel} onChange={e => alterar(i, { papel: e.target.value as PapelParticipante })}>
                    {PAPEIS.map(papel => <option key={papel} value={papel}>{ROTULO_PAPEL[papel]}</option>)}
                  </select>
                )}
              </Field>
            </div>
          ))}
          {participantes.length < MAX_PARTICIPANTES && (
            <Button variant="secondary" icon="person_add" fullWidth onClick={adicionar}>Adicionar participante</Button>
          )}
        </fieldset>

        <Field label="Finalidade da IS" required error={erroFinalidade}>
          {aria => <input {...aria} type="text" value={finalidade} onChange={e => setFinalidade(e.target.value)} />}
        </Field>

        <div>
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${erroConsentimento ? 'border-wine bg-wine/5' : 'border-line bg-white'}`}>
            <input
              type="checkbox" className="w-6 h-6 mt-0.5 shrink-0 accent-navy" checked={consentiu}
              onChange={e => setConsentiu(e.target.checked)} aria-required="true" aria-invalid={erroConsentimento ? true : undefined}
              aria-describedby={erroConsentimento ? 'consentimento-erro' : undefined}
            />
            <span className="text-sm font-semibold text-ink">
              O inspecionado foi informado e consentiu com a gravação<span className="text-wine ml-0.5" aria-hidden="true">*</span>
            </span>
          </label>
          {erroConsentimento && (
            <p id="consentimento-erro" role="alert" className="mt-1 text-xs font-semibold text-wine flex items-start gap-1">
              <span className="material-symbols-outlined text-[16px] leading-none mt-px" aria-hidden="true">error</span>
              {erroConsentimento}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 p-3 flex items-center gap-2 text-xs">
          <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">tips_and_updates</span>
          <p>Celular sobre a mesa, entre os participantes.</p>
        </div>

        {erroEnvio && (
          <p role="alert" className="text-sm font-semibold text-wine flex items-start gap-1">
            <span className="material-symbols-outlined text-[18px] leading-none mt-px" aria-hidden="true">error</span>
            {erroEnvio}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" fullWidth icon="mic" loading={salvando}>Avançar para a gravação</Button>
      </div>
    </form>
  );
};
