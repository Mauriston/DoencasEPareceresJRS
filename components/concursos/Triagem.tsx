// Ficheiro: components/concursos/Triagem.tsx
// Triagem da IS de concurso (ver utils/triagem.ts):
// - TriagemBotao: chip "TRIAR" vermelho (só MPI, IS de hoje sem triagem) / chip "TRIADO" verde (todos menos a
//   Secretaria), com badge vermelho de alertas + alterações; some com a IS finalizada.
// - TriagemFormulario: lançamento/edição pelo MPI (modal no desktop, bottom sheet no
//   celular), com os alertas de possível inaptidão.
// - TriagemSecao: resumo na barra lateral da IS, com botões de copiar o dado bruto e os
//   valores alterados em vermelho (sem os alertas).
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import {
  ALTERACOES, ISHIHARA_PLACAS, TRIAGEM_VAZIA, alertasDaTriagem, calcularImc, formatarDecimal, mascaraAltura,
  mascaraInteiro3, mascaraIshihara, pendenciasDaTriagem, validarTriagem,
  type CampoTriagem, type TriagemDados, type TriagemRecord,
} from '../../utils/triagem';

// ---------------------------------------------------------------------------
// Botão de texto na linha da tabela

export const TriagemBotao: React.FC<{ triagem: TriagemRecord | null; onTriar: () => void; onVer: () => void }> = ({ triagem, onTriar, onVer }) => {
  if (!triagem) {
    return (
      <button type="button" onClick={e => { e.stopPropagation(); onTriar(); }} className="font-sans inline-flex items-center h-6 px-2.5 rounded-full bg-wine text-white text-xs font-bold tracking-wide hover:bg-wine-dark shadow-sm">
        TRIAR
      </button>
    );
  }
  const pend = pendenciasDaTriagem(triagem);
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onVer(); }} className="relative font-sans inline-flex items-center h-6 px-2.5 rounded-full bg-green-700 text-white text-xs font-bold tracking-wide hover:bg-green-900 shadow-sm">
      TRIADO
      {pend > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-wine text-white text-xs leading-[18px] text-center ring-2 ring-white" aria-label={`${pend} achados na triagem`}>{pend}</span>
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Formulário (MPI)

const rotuloCls = 'block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1';
const inputCls = (erro?: string, alerta?: boolean) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm font-semibold focus:outline-none focus:border-navy ${erro ? 'border-wine' : alerta ? 'border-wine text-wine' : 'border-ink-5 text-navy'}`;

const Campo: React.FC<{ rotulo: string; unidade?: string; erro?: string; children: React.ReactNode }> = ({ rotulo, unidade, erro, children }) => (
  <div>
    <label className={rotuloCls}>{rotulo}{unidade && <span className="normal-case font-semibold"> ({unidade})</span>}</label>
    {children}
    {erro && <p className="text-xs font-semibold text-wine mt-1">{erro}</p>}
  </div>
);

const Snellen: React.FC<{ valor: string; onChange: (v: string) => void; erro?: string; alerta?: boolean; placeholder?: string }> = ({ valor, onChange, erro, alerta, placeholder }) => (
  <div className={`flex items-center rounded-lg border bg-white ${erro || alerta ? 'border-wine' : 'border-ink-5'} focus-within:border-navy`}>
    <span className="pl-3 text-sm font-semibold text-ink-3">20/</span>
    <input
      inputMode="numeric" value={valor} placeholder={placeholder} onChange={e => onChange(mascaraInteiro3(e.target.value))}
      className={`w-full px-1 py-2.5 rounded-lg text-sm font-semibold focus:outline-none ${alerta ? 'text-wine' : 'text-navy'}`}
    />
  </div>
);

interface FormProps {
  candidatoNome: string;
  inicial: TriagemRecord | null;
  onSalvar: (dados: TriagemDados) => Promise<void>;
  onClose: () => void;
}

export const TriagemFormulario: React.FC<FormProps> = ({ candidatoNome, inicial, onSalvar, onClose }) => {
  const isDesktop = useIsDesktop();
  const [t, setT] = useState<TriagemDados>(() => (inicial ? { ...TRIAGEM_VAZIA, ...inicial } : TRIAGEM_VAZIA));
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');

  const set = <K extends keyof TriagemDados>(k: K, v: TriagemDados[K]) => setT(prev => ({ ...prev, [k]: v }));
  const imc = calcularImc(t);
  const alertas = useMemo(() => alertasDaTriagem(t), [t]);
  const comAlerta = (c: CampoTriagem) => alertas.some(a => a.campo === c);
  const erros = validarTriagem(t);
  const erro = (k: keyof TriagemDados) => (tentou ? erros[k] : undefined);

  const salvar = async () => {
    setTentou(true);
    if (Object.keys(erros).length) return;
    setSalvando(true);
    setErroSalvar('');
    try {
      await onSalvar({
        ...t,
        entrevista: t.entrevista.alterado ? t.entrevista : { alterado: false, texto: '' },
        exameClinico: t.exameClinico.alterado ? t.exameClinico : { alterado: false, texto: '' },
        exames: t.exames.alterado ? t.exames : { alterado: false, texto: '' },
      });
    } catch (e: any) {
      setErroSalvar(e?.message || 'Não foi possível salvar a triagem.');
      setSalvando(false);
    }
  };

  const corpo = (
    <div className="space-y-5 text-sm">
      <p className="text-ink-3">Candidato: <strong className="text-navy">{candidatoNome}</strong></p>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-navy mb-2">Biometria</legend>
        <div className="grid grid-cols-3 gap-3">
          <Campo rotulo="Altura" unidade="m" erro={erro('altura')}>
            <input inputMode="numeric" placeholder="1,75" value={t.altura} onChange={e => set('altura', mascaraAltura(e.target.value))} className={inputCls(erro('altura'), comAlerta('altura'))} />
          </Campo>
          <Campo rotulo="Peso" unidade="kg" erro={erro('peso')}>
            <input inputMode="numeric" value={t.peso} onChange={e => set('peso', mascaraInteiro3(e.target.value))} className={inputCls(erro('peso'))} />
          </Campo>
          <Campo rotulo="IMC" unidade="kg/m²">
            <input readOnly tabIndex={-1} value={formatarDecimal(imc)} placeholder="—" className={`${inputCls(undefined, comAlerta('imc'))} bg-paper`} />
          </Campo>
          <Campo rotulo="PAS" unidade="mmHg" erro={erro('pas')}>
            <input inputMode="numeric" value={t.pas} onChange={e => set('pas', mascaraInteiro3(e.target.value))} className={inputCls(erro('pas'), comAlerta('pas'))} />
          </Campo>
          <Campo rotulo="PAD" unidade="mmHg" erro={erro('pad')}>
            <input inputMode="numeric" value={t.pad} onChange={e => set('pad', mascaraInteiro3(e.target.value))} className={inputCls(erro('pad'), comAlerta('pad'))} />
          </Campo>
          <Campo rotulo="FC" unidade="bpm" erro={erro('fc')}>
            <input inputMode="numeric" value={t.fc} onChange={e => set('fc', mascaraInteiro3(e.target.value))} className={inputCls(erro('fc'), comAlerta('fc'))} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-navy mb-2">Oftalmologia</legend>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Snellen S/C" erro={erro('snellenSC')}>
            <Snellen valor={t.snellenSC} onChange={v => set('snellenSC', v)} erro={erro('snellenSC')} alerta={comAlerta('snellenSC')} />
          </Campo>
          <Campo rotulo="Snellen C/C" erro={erro('snellenCC')}>
            <Snellen valor={t.snellenCC} onChange={v => set('snellenCC', v)} erro={erro('snellenCC')} alerta={comAlerta('snellenCC')} placeholder="opcional" />
          </Campo>
          <Campo rotulo="Ishihara · placas">
            <input readOnly tabIndex={-1} value={ISHIHARA_PLACAS} className={`${inputCls()} bg-paper`} />
          </Campo>
          <Campo rotulo="Ishihara · erros" erro={erro('ishiharaErros')}>
            <input inputMode="numeric" value={t.ishiharaErros} onChange={e => set('ishiharaErros', mascaraIshihara(e.target.value))} className={inputCls(erro('ishiharaErros'), comAlerta('ishiharaErros'))} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-navy mb-2">Outros</legend>
        {ALTERACOES.map(a => (
          <div key={a.chave}>
            <label className="flex items-center gap-2 min-h-[36px] text-sm font-semibold text-ink cursor-pointer">
              <input type="checkbox" checked={t[a.chave].alterado} onChange={e => set(a.chave, { ...t[a.chave], alterado: e.target.checked })} className="w-4 h-4 accent-navy" />
              {a.rotulo} com alteração
            </label>
            {t[a.chave].alterado && (
              <>
                <textarea
                  rows={2} value={t[a.chave].texto} onChange={e => set(a.chave, { ...t[a.chave], texto: e.target.value })}
                  placeholder={`Descreva a alteração (${a.rotulo.toLowerCase()})`}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm text-ink focus:outline-none focus:border-navy resize-none ${erro(a.chave) ? 'border-wine' : 'border-ink-5'}`}
                />
                {erro(a.chave) && <p className="text-xs font-semibold text-wine">{erro(a.chave)}</p>}
              </>
            )}
          </div>
        ))}
      </fieldset>

      {alertas.length > 0 && (
        <div role="alert" className="rounded-xl border border-wine-200 bg-wine-50 p-3 space-y-1.5">
          <p className="text-sm font-bold text-wine flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
            {alertas.length === 1 ? 'Alerta' : `${alertas.length} alertas`}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-wine">
            {alertas.map((a, i) => <li key={i}>{a.mensagem}</li>)}
          </ul>
        </div>
      )}
      {erroSalvar && <p role="alert" className="text-sm font-semibold text-wine">{erroSalvar}</p>}
    </div>
  );

  const rodape = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
      <Button icon="save" loading={salvando} onClick={salvar}>Salvar triagem</Button>
    </>
  );
  const titulo = inicial ? 'Editar triagem' : 'Triagem';

  return isDesktop
    ? <Dialog title={titulo} icon="monitor_heart" size="lg" travado={salvando} onClose={onClose} footer={rodape}>{corpo}</Dialog>
    : <Drawer title={titulo} icon="monitor_heart" onClose={salvando ? () => {} : onClose} footer={rodape}>{corpo}</Drawer>;
};

// ---------------------------------------------------------------------------
// Resumo na barra lateral

const copiar = async (valor: string, onCopiado: (msg: string) => void) => {
  try {
    await navigator.clipboard.writeText(valor);
    onCopiado(`"${valor}" copiado.`);
  } catch {
    onCopiado('Não foi possível copiar automaticamente.');
  }
};

const Dado: React.FC<{ rotulo: string; exibido: string; bruto: string; alterado?: boolean; onCopiado: (m: string) => void }> = ({ rotulo, exibido, bruto, alterado, onCopiado }) => (
  <div className="flex items-center justify-between gap-2 min-h-[32px]">
    <span className="text-xs font-semibold text-ink-3">{rotulo}</span>
    <span className="flex items-center gap-1">
      <span className={`text-sm font-bold ${alterado ? 'text-wine' : 'text-navy'}`}>{exibido}</span>
      {bruto && (
        <button type="button" onClick={() => copiar(bruto, onCopiado)} aria-label={`Copiar ${rotulo}`} title="Copiar" className="inline-flex items-center justify-center w-7 h-7 rounded text-navy hover:bg-white">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
        </button>
      )}
    </span>
  </div>
);

const Bloco: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div>
    <h4 className="text-xs font-bold uppercase tracking-wide text-gold-800 mb-1">{titulo}</h4>
    <div className="divide-y divide-gold-200">{children}</div>
  </div>
);

export const TriagemSecao: React.FC<{ triagem: TriagemRecord; onEditar?: () => void; onCopiado: (m: string) => void }> = ({ triagem: t, onEditar, onCopiado }) => {
  const alertas = alertasDaTriagem(t);
  const al = (c: CampoTriagem) => alertas.some(a => a.campo === c);
  const imc = formatarDecimal(calcularImc(t));
  const outros = ALTERACOES.filter(a => t[a.chave].alterado);

  return (
    <section aria-label="Triagem" className="rounded-xl bg-gold-50 border border-gold-200 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-navy flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[20px] text-gold-700" aria-hidden="true">monitor_heart</span>
          Triagem
        </h3>
        {onEditar && <Button variant="secondary" icon="edit" onClick={onEditar}>Editar</Button>}
      </div>

      <Bloco titulo="Biometria">
        <Dado rotulo="Altura" exibido={`${t.altura} m`} bruto={t.altura} alterado={al('altura')} onCopiado={onCopiado} />
        <Dado rotulo="Peso" exibido={`${t.peso} kg`} bruto={t.peso} onCopiado={onCopiado} />
        <Dado rotulo="IMC" exibido={imc ? `${imc} kg/m²` : '—'} bruto={imc} alterado={al('imc')} onCopiado={onCopiado} />
        <Dado rotulo="PAS" exibido={`${t.pas} mmHg`} bruto={t.pas} alterado={al('pas')} onCopiado={onCopiado} />
        <Dado rotulo="PAD" exibido={`${t.pad} mmHg`} bruto={t.pad} alterado={al('pad')} onCopiado={onCopiado} />
        <Dado rotulo="FC" exibido={`${t.fc} bpm`} bruto={t.fc} alterado={al('fc')} onCopiado={onCopiado} />
      </Bloco>

      <Bloco titulo="Oftalmologia">
        <Dado rotulo="Snellen S/C" exibido={`20/${t.snellenSC}`} bruto={t.snellenSC} alterado={al('snellenSC')} onCopiado={onCopiado} />
        <Dado rotulo="Snellen C/C" exibido={t.snellenCC ? `20/${t.snellenCC}` : '—'} bruto={t.snellenCC} alterado={al('snellenCC')} onCopiado={onCopiado} />
        <Dado rotulo="Ishihara · placas" exibido={String(ISHIHARA_PLACAS)} bruto={String(ISHIHARA_PLACAS)} onCopiado={onCopiado} />
        <Dado rotulo="Ishihara · erros" exibido={t.ishiharaErros} bruto={t.ishiharaErros} alterado={al('ishiharaErros')} onCopiado={onCopiado} />
      </Bloco>

      {outros.length > 0 && (
        <Bloco titulo="Outros">
          {outros.map(a => (
            <div key={a.chave} className="py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-3">{a.rotulo}</span>
                <button type="button" onClick={() => copiar(t[a.chave].texto, onCopiado)} aria-label={`Copiar ${a.rotulo}`} title="Copiar" className="inline-flex items-center justify-center w-7 h-7 rounded text-navy hover:bg-white">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
                </button>
              </div>
              <p className="text-sm text-wine font-semibold whitespace-pre-wrap break-words">{t[a.chave].texto}</p>
            </div>
          ))}
        </Bloco>
      )}

      {t.atualizadoPor && (
        <p className="text-xs text-ink-3">Por {t.atualizadoPor}{t.atualizadoEm ? ` em ${new Date(t.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}.</p>
      )}
    </section>
  );
};
