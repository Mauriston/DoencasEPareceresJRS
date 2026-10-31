// Ficheiro: components/militares/InformacoesAdicionais.tsx
// Seção "+ informações" do cadastro de militares (cadastro novo e edição).
// Só aparece para quem serve no HNRe: mostra o Serviço (setor) e, sendo oficial
// do quadro de médicos, também os dados pessoais/profissionais e a foto.
import React, { useEffect, useMemo, useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Autocomplete, type OpcaoAutocomplete } from '@/components/ui/Autocomplete';
import { ESPECIALIDADES_MEDICAS } from '@/data/especialidadesMedicas';
import { carregarServicosHnre, normalizarBusca, type ServicoHnre } from '@/utils/corposQuadros';
import { formatCpf, formatIdentidadeMilitar, cpfValido } from '@/utils/format';
import { prepararFoto } from '@/services/militarFoto';
import type { MilitarDoc } from '@/services/firestoreMilitares';

export interface Adicionais {
  servicoLabel: string;
  nomeGuerra: string;
  especialidade: string;
  emailPessoal: string;
  cpf: string;
  identidadeMilitar: string;
  crm: string;
  rqe: string;
  fotoUrl: string;
  /** Foto nova, já recortada, a enviar ao salvar. */
  fotoNova: Blob | null;
}

export const ADICIONAIS_VAZIO: Adicionais = {
  servicoLabel: '', nomeGuerra: '', especialidade: '', emailPessoal: '',
  cpf: '', identidadeMilitar: '', crm: '', rqe: '', fotoUrl: '', fotoNova: null,
};

export const adicionaisDoMilitar = (m: Partial<MilitarDoc>): Adicionais => ({
  servicoLabel: m.servico_label ?? '', nomeGuerra: m.nomeGuerra ?? '', especialidade: m.especialidade ?? '',
  emailPessoal: m.emailPessoal ?? '',
  cpf: formatCpf(m.cpf), identidadeMilitar: formatIdentidadeMilitar(m.identidadeMilitar), crm: m.crm ?? '', rqe: m.rqe ?? '',
  fotoUrl: m.fotoUrl ?? '', fotoNova: null,
});

/** Campos a gravar (só os da seção visível); fotoUrl é preenchida depois do envio da imagem. */
export const adicionaisParaPatch = (a: Adicionais, medico: boolean): Partial<MilitarDoc> => {
  const patch: Partial<MilitarDoc> = { servico_label: a.servicoLabel };
  if (medico) {
    Object.assign(patch, {
      nomeGuerra: a.nomeGuerra.trim().toUpperCase(), especialidade: a.especialidade,
      emailPessoal: a.emailPessoal.trim().toLowerCase(),
      cpf: a.cpf.replace(/\D/g, ''), identidadeMilitar: a.identidadeMilitar.replace(/\D/g, ''),
      crm: a.crm.replace(/\D/g, ''), rqe: a.especialidade ? a.rqe.replace(/\D/g, '') : '',
    });
  }
  return patch;
};

export const validarAdicionais = (a: Adicionais, medico: boolean): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!medico) return e;
  if (a.cpf && !cpfValido(a.cpf)) e.cpf = 'CPF inválido.';
  if (a.identidadeMilitar && a.identidadeMilitar.replace(/\D/g, '').length !== 7) e.identidadeMilitar = 'Use o formato 000000-0.';
  if (a.emailPessoal && !/^\S+@\S+\.\S+$/.test(a.emailPessoal.trim())) e.emailPessoal = 'E-mail inválido.';
  return e;
};

interface Props {
  valor: Adicionais;
  onChange: (a: Adicionais) => void;
  medico: boolean;
  erros: Record<string, string>;
}

export const InformacoesAdicionais: React.FC<Props> = ({ valor, onChange, medico, erros }) => {
  const [aberto, setAberto] = useState(() => Object.values({ ...valor, fotoNova: '' }).some(Boolean));
  const [servicos, setServicos] = useState<ServicoHnre[]>([]);
  const [servicoTexto, setServicoTexto] = useState(valor.servicoLabel);
  const [espTexto, setEspTexto] = useState(valor.especialidade);
  const [erroFoto, setErroFoto] = useState('');
  const [previa, setPrevia] = useState('');

  useEffect(() => { if (Object.values(erros).some(Boolean)) setAberto(true); }, [erros]);

  const set = (parcial: Partial<Adicionais>) => onChange({ ...valor, ...parcial });

  useEffect(() => { carregarServicosHnre().then(setServicos).catch(() => { /* sem lista, o campo fica sem opções */ }); }, []);

  const opcoesServico: OpcaoAutocomplete[] = useMemo(() => servicos.map(s => ({
    chave: s.servico_id, principal: s.servico, secundaria: s.servico_id, busca: normalizarBusca(`${s.servico_id} ${s.servico}`),
  })), [servicos]);
  const opcoesEsp: OpcaoAutocomplete[] = useMemo(() => ESPECIALIDADES_MEDICAS.map(e => ({ chave: e, principal: e })), []);

  useEffect(() => {
    if (!valor.fotoNova) { setPrevia(''); return; }
    const url = URL.createObjectURL(valor.fotoNova);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [valor.fotoNova]);

  const receberFoto = async (arquivo: Blob | null | undefined) => {
    if (!arquivo) return;
    try { setErroFoto(''); set({ fotoNova: await prepararFoto(arquivo) }); }
    catch (e: any) { setErroFoto(e?.message || 'Não foi possível usar a imagem.'); }
  };

  // Colar imagem (Ctrl+V) em qualquer ponto enquanto a seção de médico está aberta.
  useEffect(() => {
    if (!aberto || !medico) return;
    const colar = (ev: ClipboardEvent) => {
      const arq = Array.from(ev.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'));
      if (arq) { ev.preventDefault(); void receberFoto(arq); }
    };
    document.addEventListener('paste', colar);
    return () => document.removeEventListener('paste', colar);
  });

  const foto = previa || valor.fotoUrl;

  return (
    <div>
      <button type="button" onClick={() => setAberto(v => !v)} aria-expanded={aberto} className="min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{aberto ? 'expand_less' : 'add'}</span>
        {aberto ? 'Menos informações' : '+ informações'}
      </button>
      {aberto && (
        <div className="space-y-4 pt-1">
          <Autocomplete
            label="Serviço do HNRe" placeholder="Digite o nome ou o código do serviço"
            valor={servicoTexto} opcoes={opcoesServico}
            onDigitar={t => { setServicoTexto(t); set({ servicoLabel: t === valor.servicoLabel ? valor.servicoLabel : '' }); }}
            onSelecionar={o => { const s = servicos.find(x => x.servico_id === o.chave); if (s) { setServicoTexto(s.servico_label); set({ servicoLabel: s.servico_label }); } }}
          />
          {medico && (
            <>
              <Field label="Nome de guerra">
                {a => <input {...a} type="text" value={valor.nomeGuerra} onChange={e => set({ nomeGuerra: e.target.value.toUpperCase() })} className={`${a.className} uppercase`} autoComplete="off" />}
              </Field>
              <Autocomplete
                label="Especialidade" placeholder="Digite para buscar a especialidade"
                valor={espTexto} opcoes={opcoesEsp}
                onDigitar={t => { setEspTexto(t); set({ especialidade: t === valor.especialidade ? t : '', rqe: t === valor.especialidade ? valor.rqe : '' }); }}
                onSelecionar={o => { setEspTexto(o.principal); set({ especialidade: o.principal }); }}
              />
              <Field label="E-mail pessoal" error={erros.emailPessoal}>
                {a => <input {...a} type="email" value={valor.emailPessoal} onChange={e => set({ emailPessoal: e.target.value })} autoComplete="off" />}
              </Field>
              <Field label="CPF" error={erros.cpf}>
                {a => <input {...a} type="text" inputMode="numeric" placeholder="000.000.000-00" value={valor.cpf} onChange={e => set({ cpf: formatCpf(e.target.value) })} maxLength={14} className={`${a.className} font-mono`} autoComplete="off" />}
              </Field>
              <Field label="Identidade militar" error={erros.identidadeMilitar}>
                {a => <input {...a} type="text" inputMode="numeric" placeholder="000000-0" value={valor.identidadeMilitar} onChange={e => set({ identidadeMilitar: formatIdentidadeMilitar(e.target.value) })} maxLength={8} className={`${a.className} font-mono`} autoComplete="off" />}
              </Field>
              <Field label="CRM-PE">
                {a => <input {...a} type="text" inputMode="numeric" value={valor.crm} onChange={e => set({ crm: e.target.value.replace(/\D/g, '').slice(0, 8) })} autoComplete="off" />}
              </Field>
              {valor.especialidade && (
                <Field label="RQE">
                  {a => <input {...a} type="text" inputMode="numeric" value={valor.rqe} onChange={e => set({ rqe: e.target.value.replace(/\D/g, '').slice(0, 8) })} autoComplete="off" />}
                </Field>
              )}
              <div>
                <p className="block text-xs font-semibold text-ink-3 mb-1">Imagem</p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 shrink-0 rounded-full bg-thead border border-line overflow-hidden flex items-center justify-center">
                    {foto ? <img src={foto} alt="Foto do militar" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[36px] text-ink-4" aria-hidden="true">person</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg border border-line bg-white text-sm font-bold text-navy cursor-pointer hover:bg-thead focus-within:outline focus-within:outline-2 focus-within:outline-gold">
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">upload</span>
                      Escolher imagem
                      <input type="file" accept="image/*" className="sr-only" onChange={e => { void receberFoto(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <p className="text-xs text-ink-3">Ou cole uma imagem com Ctrl+V.</p>
                  </div>
                </div>
                {erroFoto && <p role="alert" className="mt-1 text-xs font-semibold text-wine">{erroFoto}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
