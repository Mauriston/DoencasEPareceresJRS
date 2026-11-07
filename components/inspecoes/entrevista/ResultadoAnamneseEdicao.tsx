// Ficheiro: components/inspecoes/entrevista/ResultadoAnamneseEdicao.tsx
// Edição da anamnese pelo perito: textos e listas (uma linha por item), a cronologia item a item
// e as citações. Grava `anamneseEditada` (a original da IA fica preservada em `anamnese`).
import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import type { AnamneseEntrevista, FonteInformacao, ItemCronologia } from '../../../config/entrevistas';
import { ROTULO_FONTE, formatarTempo, limparAnamnese, listaParaTexto, nomeDoFalante, normalizarAnamnese, textoParaLista, tituloSecaoFinalidade } from '../../../utils/entrevistas';

interface Props {
  inicial: AnamneseEntrevista;
  finalidade: string;
  mapaFalantes?: Record<string, string>;
  salvando: boolean;
  onSalvar: (a: AnamneseEntrevista) => void;
  onCancelar: () => void;
}

type CampoTexto = 'resumoExecutivo' | 'queixaPrincipal' | 'repercussaoFuncional';
type CampoLista = 'alegacoesInspecionado' | 'antecedentes' | 'medicacoes' | 'tratamentos' | 'examesCitados' | 'pontosAEsclarecer';

const FONTES = Object.keys(ROTULO_FONTE) as FonteInformacao[];

export const ResultadoAnamneseEdicao: React.FC<Props> = ({ inicial, finalidade, mapaFalantes, salvando, onSalvar, onCancelar }) => {
  const base = normalizarAnamnese(inicial);
  const [a, setA] = useState<AnamneseEntrevista>(base);
  // Listas editadas como texto (uma linha por item) para não perder linhas em branco enquanto digita.
  const [listas, setListas] = useState<Record<CampoLista, string>>(() => ({
    alegacoesInspecionado: listaParaTexto(base.alegacoesInspecionado),
    antecedentes: listaParaTexto(base.antecedentes),
    medicacoes: listaParaTexto(base.medicacoes),
    tratamentos: listaParaTexto(base.tratamentos),
    examesCitados: listaParaTexto(base.examesCitados),
    pontosAEsclarecer: listaParaTexto(base.pontosAEsclarecer),
  }));

  const texto = (campo: CampoTexto, label: string, linhas = 3) => (
    <Field label={label}>
      {f => <textarea {...f} rows={linhas} value={a[campo]} onChange={e => setA(x => ({ ...x, [campo]: e.target.value }))} className={`${f.className} min-h-[72px]`} />}
    </Field>
  );
  const lista = (campo: CampoLista, label: string) => (
    <Field label={label} help="Um item por linha.">
      {f => <textarea {...f} rows={3} value={listas[campo]} onChange={e => setListas(x => ({ ...x, [campo]: e.target.value }))} className={`${f.className} min-h-[72px]`} />}
    </Field>
  );
  const mudarItem = (k: number, patch: Partial<ItemCronologia>) =>
    setA(x => ({ ...x, historiaCronologica: x.historiaCronologica.map((i, j) => (j === k ? { ...i, ...patch } : i)) }));

  const salvar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const final: AnamneseEntrevista = { ...a };
    (Object.keys(listas) as CampoLista[]).forEach(c => { final[c] = textoParaLista(listas[c]); });
    onSalvar(limparAnamnese(final));
  };

  return (
    <form onSubmit={salvar} className="space-y-4" aria-label="Editar anamnese">
      {texto('resumoExecutivo', 'Resumo executivo', 4)}
      {texto('queixaPrincipal', 'Queixa principal', 2)}
      {lista('alegacoesInspecionado', 'Alegações do inspecionado')}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-ink-3 mb-1">História em ordem cronológica</legend>
        {a.historiaCronologica.map((i, k) => (
          <div key={k} className="rounded-lg border border-line p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="Quando">
                {f => <input {...f} type="text" value={i.quando} onChange={e => mudarItem(k, { quando: e.target.value })} placeholder="ex.: mar/2024" />}
              </Field>
              <Field label="Fonte">
                {f => (
                  <select {...f} value={i.fonte} onChange={e => mudarItem(k, { fonte: e.target.value as FonteInformacao })}>
                    {FONTES.map(fo => <option key={fo} value={fo}>{ROTULO_FONTE[fo]}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Evento" help={typeof i.tempoSeg === 'number' ? `No áudio em ${formatarTempo(i.tempoSeg)}.` : undefined}>
              {f => <textarea {...f} rows={2} value={i.evento} onChange={e => mudarItem(k, { evento: e.target.value })} className={`${f.className} min-h-[60px]`} />}
            </Field>
            <Button variant="ghost" icon="delete" onClick={() => setA(x => ({ ...x, historiaCronologica: x.historiaCronologica.filter((_, j) => j !== k) }))}>
              Remover item
            </Button>
          </div>
        ))}
        <Button variant="secondary" icon="add" onClick={() => setA(x => ({ ...x, historiaCronologica: [...x.historiaCronologica, { quando: '', evento: '', fonte: 'relato_inspecionado' }] }))}>
          Adicionar item
        </Button>
      </fieldset>

      {lista('antecedentes', 'Antecedentes')}
      {lista('medicacoes', 'Medicações')}
      {lista('tratamentos', 'Tratamentos')}
      {lista('examesCitados', 'Exames citados')}
      {texto('repercussaoFuncional', 'Repercussão funcional')}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-ink-3 mb-1">{tituloSecaoFinalidade(a, finalidade)}</legend>
        <Field label="Título da seção">
          {f => <input {...f} type="text" value={a.secaoFinalidade.titulo} onChange={e => setA(x => ({ ...x, secaoFinalidade: { ...x.secaoFinalidade, titulo: e.target.value } }))} />}
        </Field>
        <Field label="Texto">
          {f => <textarea {...f} rows={4} value={a.secaoFinalidade.texto} onChange={e => setA(x => ({ ...x, secaoFinalidade: { ...x.secaoFinalidade, texto: e.target.value } }))} className={`${f.className} min-h-[88px]`} />}
        </Field>
      </fieldset>

      {lista('pontosAEsclarecer', 'Pontos a esclarecer')}

      {a.citacoes.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-ink-3 mb-1">Citações literais</legend>
          {a.citacoes.map((c, k) => (
            <div key={k} className="flex items-start gap-2">
              <Field label={`${nomeDoFalante(c.falante, mapaFalantes)} · ${formatarTempo(c.tempoSeg)}`} className="flex-1">
                {f => <textarea {...f} rows={2} value={c.texto} onChange={e => setA(x => ({ ...x, citacoes: x.citacoes.map((ci, j) => (j === k ? { ...ci, texto: e.target.value } : ci)) }))} className={`${f.className} min-h-[60px]`} />}
              </Field>
              <button
                type="button"
                onClick={() => setA(x => ({ ...x, citacoes: x.citacoes.filter((_, j) => j !== k) }))}
                aria-label={`Remover a citação de ${formatarTempo(c.tempoSeg)}`}
                className="mt-5 shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-ink-3 hover:text-wine hover:bg-thead"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
              </button>
            </div>
          ))}
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2 justify-end border-t border-line pt-3">
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" icon="save" loading={salvando}>Salvar edição</Button>
      </div>
    </form>
  );
};
