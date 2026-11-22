// Ficheiro: components/ficha/inspecoes/documentos/FormLaudoPericial.tsx
// Formulário do "Laudo Pericial" (Isenção de IR — DGPM-406 Anexo V-I-1). Ao abrir: lê o CPF do cadastro (o campo só
// aparece se o inspecionado não tiver CPF), o médico que lançou o laudo (usuarios/{peritoUid}: CRM; especialidade
// editável) e os exames PDF da IS; a IA (services/laudoPericialIA.ts) sugere a doença legal e a exposição dos
// exames (itens com datas), tudo editável. Gerador: servidor/documentos/is/laudoPericial.ts (assina o Presidente).
import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../../../services/firebaseAuth';
import { DialogFormularioDocumento } from './DialogFormularioDocumento';
import { Field } from '../../../ui/Field';
import { observarExamesDaIS } from '../../../../services/examesIS';
import { sugerirLaudoPericial } from '../../../../services/laudoPericialIA';
import { DOENCAS_LEGAIS_IR, ehDoencaLegalIR, sugerirDoencaLegalPeloLaudo } from '../../../../utils/documentosIS';
import type { PropsFormularioDocumentoIS } from './tipos';

const soDigitos = (v: string) => v.replace(/\D/g, '').slice(0, 11);
const mascaraCpf = (v: string) => {
  const d = soDigitos(v);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join('.') + (d.length > 9 ? `-${d.slice(9)}` : '');
};

export const FormLaudoPericial: React.FC<PropsFormularioDocumentoIS> = ({ is, enviando, onEnviar, onCancelar }) => {
  const [cpfCadastro, setCpfCadastro] = useState<string | null>(null);
  const [cpf, setCpf] = useState('');
  const [doenca, setDoenca] = useState<string>(() => sugerirDoencaLegalPeloLaudo(is.laudo) ?? '');
  const [exposicao, setExposicao] = useState('');
  const [medicoNome, setMedicoNome] = useState('');
  const [crm, setCrm] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [ia, setIa] = useState<'lendo' | 'ok' | 'sem_exames' | 'erro'>('lendo');

  // Cadastro (CPF) e médico do laudo.
  useEffect(() => {
    const db = getFirestore(app);
    if (is.inspecionadoId) {
      getDoc(doc(db, 'militares', is.inspecionadoId))
        .then(s => setCpfCadastro(String(s.data()?.cpf || '').trim()))
        .catch(() => setCpfCadastro(''));
    } else setCpfCadastro('');
    if (is.peritoUid) {
      getDoc(doc(db, 'usuarios', is.peritoUid)).then(s => {
        const u = s.data() || {};
        setMedicoNome(prev => prev || [u.postoGraduacao, u.nome].filter(Boolean).join(' ') || is.peritoNome || '');
        setCrm(prev => prev || (u.crmPe ? `${u.crmPe}-PE` : ''));
        setEspecialidade(prev => prev || String(u.especialidade || ''));
      }).catch(() => setMedicoNome(prev => prev || is.peritoNome || ''));
    } else setMedicoNome(is.peritoNome || '');
  }, [is.inspecionadoId, is.peritoUid, is.peritoNome]);

  // Exames da IS (uma leitura) → IA.
  useEffect(() => {
    let vivo = true;
    let parar: (() => void) | undefined;
    parar = observarExamesDaIS(is.id, async lista => {
      parar?.(); parar = undefined;
      if (!vivo) return;
      try {
        const s = await sugerirLaudoPericial(is, lista);
        if (!vivo) return;
        if (s.doenca) setDoenca(s.doenca);
        if (s.exposicao) setExposicao(prev => prev || s.exposicao);
        setIa(lista.length ? 'ok' : 'sem_exames');
      } catch { if (vivo) setIa('erro'); }
    }, () => { if (vivo) setIa('erro'); });
    return () => { vivo = false; parar?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is.id]);

  const precisaCpf = cpfCadastro === '';
  const cpfOk = !precisaCpf || soDigitos(cpf).length === 11;
  const invalido = cpfCadastro === null || !cpfOk || !ehDoencaLegalIR(doenca) || !medicoNome.trim() || !especialidade.trim();
  const avisoIa = { lendo: 'A IA está lendo o laudo e os exames da IS…', ok: 'Pré-preenchido pela IA: revise antes de gerar.',
    sem_exames: 'Sem exames PDF na IS: descreva os exames manualmente.', erro: 'A IA não respondeu: preencha manualmente.' }[ia];

  return (
    <DialogFormularioDocumento
      titulo="Laudo Pericial" icone="contract" size="lg" enviando={enviando} invalido={invalido} onCancelar={onCancelar}
      onGerar={() => onEnviar({
        doenca, exposicao, medicoNome: medicoNome.trim(), medicoCrm: crm.trim(), medicoEspecialidade: especialidade.trim(),
        ...(precisaCpf ? { cpf: soDigitos(cpf) } : {}),
      })}
    >
      <p className="text-sm text-ink-3">IS nº {is.is} — {is.finalidade}. Assinado pelo Presidente (com rubrica).</p>
      <p className="text-xs text-ink-3 bg-thead rounded-lg p-2 whitespace-pre-line"><b>Laudo:</b> {is.laudo}</p>
      {precisaCpf && (
        <Field label="CPF do inspecionado" required help="Não há CPF no cadastro."
          error={cpf && !cpfOk ? 'CPF com 11 dígitos.' : undefined}>
          {aria => <input {...aria} inputMode="numeric" value={mascaraCpf(cpf)} onChange={e => setCpf(soDigitos(e.target.value))} placeholder="000.000.000-00" />}
        </Field>
      )}
      <Field label="Doença especificada em lei (denominação do legislador)" required>
        {aria => (
          <select {...aria} value={doenca} onChange={e => setDoenca(e.target.value)}>
            <option value="">Selecione…</option>
            {DOENCAS_LEGAIS_IR.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </Field>
      <Field label="Exposição das observações, estudos, exames efetuados e registros das conclusões" help={`Um item por linha, com a data do laudo. ${avisoIa}`}>
        {aria => <textarea {...aria} rows={7} value={exposicao} onChange={e => setExposicao(e.target.value)}
          placeholder={ia === 'lendo' ? 'Aguardando a IA…' : 'Ex.: Biópsia de mama (12/01/2025): carcinoma ductal invasivo.'} />}
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Médico (laudo da IS)" required className="md:col-span-3">
          {aria => <input {...aria} value={medicoNome} onChange={e => setMedicoNome(e.target.value)} />}
        </Field>
        <Field label="CRM">{aria => <input {...aria} value={crm} onChange={e => setCrm(e.target.value)} />}</Field>
        <Field label="Especialidade" required help={especialidade.trim() ? undefined : 'Obrigatória no Laudo Pericial. Preencha aqui ou no cadastro do médico (Administração › Usuários).'} className="md:col-span-2">{aria => <input {...aria} value={especialidade} onChange={e => setEspecialidade(e.target.value)} />}</Field>
      </div>
    </DialogFormularioDocumento>
  );
};
