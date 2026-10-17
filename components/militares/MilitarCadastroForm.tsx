// Ficheiro: components/militares/MilitarCadastroForm.tsx
// Formulário "Cadastrar novo" de militar, em barra lateral à direita (desktop) ou
// bottom sheet (mobile) — ver ui/Drawer. Campos em cascata, nesta ordem:
// Vínculo → Posto/Graduação (conforme o vínculo) → [oficial: Quadro] ou
// [praça: CPFN? → Especialidade] → Nome → NIP → OM (autocomplete). O INSPECIONADO
// é montado como POSTO (QUADRO) NIP NOME (oficial) ou POSTO-ESP NIP NOME (praça).
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { formatNip } from '../../utils/format';
import {
  carregarCorposQuadros, carregarOms, postosDoVinculo, quadrosDoOficial, especialidadesDaPraca, montarPgq, montarInspecionado,
  type CorposQuadros, type OrganizacaoMilitar, type Vinculo,
} from '../../utils/corposQuadros';
import { criarMilitar } from '../../services/firestoreMilitares';

interface Props {
  onClose: () => void;
  onCriado: (nome: string) => void;
}

type Erros = Record<string, string>;

export const MilitarCadastroForm: React.FC<Props> = ({ onClose, onCriado }) => {
  const [dados, setDados] = useState<CorposQuadros | null>(null);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [falhaCarga, setFalhaCarga] = useState('');

  const [vinculo, setVinculo] = useState<Vinculo | ''>('');
  const [posto, setPosto] = useState('');
  const [quadroChave, setQuadroChave] = useState('');
  const [cpfn, setCpfn] = useState(false);
  const [espTexto, setEspTexto] = useState('');
  const [espSigla, setEspSigla] = useState('');
  const [nome, setNome] = useState('');
  const [nip, setNip] = useState('');
  const [omTexto, setOmTexto] = useState('');
  const [omSigla, setOmSigla] = useState('');
  const [email, setEmail] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([carregarCorposQuadros(), carregarOms()])
      .then(([d, o]) => { setDados(d); setOms(o); })
      .catch(e => setFalhaCarga(e?.message || 'Não foi possível carregar as listas de referência.'));
  }, []);

  const limpar = (k: string) => setErros(er => (er[k] ? { ...er, [k]: '' } : er));

  const postos = useMemo(() => (dados && vinculo ? postosDoVinculo(dados, vinculo) : []), [dados, vinculo]);
  const categoria = dados && posto ? dados.postos[posto]?.categoria : undefined;
  const quadros = useMemo(() => (dados && vinculo && posto && categoria === 'Oficial' ? quadrosDoOficial(dados, vinculo, posto) : []), [dados, vinculo, posto, categoria]);
  const especialidades = useMemo(() => (dados && vinculo && posto && categoria === 'Praça' ? especialidadesDaPraca(dados, vinculo, posto, cpfn) : []), [dados, vinculo, posto, categoria, cpfn]);

  // Um único quadro possível já vem escolhido.
  useEffect(() => {
    if (quadros.length === 1) setQuadroChave(`${quadros[0].corpo.sigla}|${quadros[0].quadro.sigla}`);
  }, [quadros]);

  const quadroEscolhido = quadros.find(q => `${q.corpo.sigla}|${q.quadro.sigla}` === quadroChave);

  const opcoesEsp: OpcaoAutocomplete[] = especialidades.map(e => ({ chave: e.sigla, principal: e.sigla, secundaria: e.nome }));
  const opcoesOm: OpcaoAutocomplete[] = useMemo(() => oms.map(o => ({ chave: `${o.sigla}|${o.nome}`, principal: o.sigla, secundaria: o.nome, busca: o.busca })), [oms]);

  const escolherVinculo = (v: Vinculo) => {
    setVinculo(v); setPosto(''); setQuadroChave(''); setCpfn(false); setEspTexto(''); setEspSigla(''); limpar('vinculo');
  };
  const escolherPosto = (p: string) => {
    setPosto(p); setQuadroChave(''); setCpfn(false); setEspTexto(''); setEspSigla(''); limpar('posto');
  };

  const pgq = categoria && posto
    ? montarPgq(categoria, posto, quadroEscolhido?.quadro.sigla ?? '', quadroEscolhido?.corpo.sigla ?? '', espSigla)
    : '';
  const nipCompleto = nip.length === 10;
  const inspecionado = pgq && nome.trim() ? montarInspecionado(pgq, nipCompleto ? nip : '', nome.trim().toUpperCase()) : '';

  const validar = (): Erros => {
    const e: Erros = {};
    if (!vinculo) e.vinculo = 'Escolha o vínculo.';
    if (vinculo && !posto) e.posto = 'Selecione o posto/graduação.';
    if (categoria === 'Oficial' && !quadroEscolhido) e.quadro = 'Selecione o quadro.';
    if (categoria === 'Praça' && especialidades.length > 0 && !espSigla) e.especialidade = 'Escolha a especialidade na lista.';
    if (!nome.trim()) e.nome = 'Informe o nome completo.';
    if (!nipCompleto) e.nip = 'Informe o NIP no formato 00.0000.00.';
    if (!omSigla) e.om = 'Escolha a OM na lista.';
    return e;
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [role="radiogroup"][aria-invalid="true"]')?.focus());
      return;
    }
    setSalvando(true);
    try {
      const nomeFinal = nome.trim().toUpperCase();
      await criarMilitar({
        om: omSigla, temporario: vinculo === 'Temporário', pgq, nip, nome: nomeFinal,
        inspecionado: montarInspecionado(pgq, nip, nomeFinal), email: email.trim().toLowerCase(), ativo: true,
      });
      onCriado(nomeFinal);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível cadastrar o militar.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer
      title="Cadastrar novo militar"
      icon="person_add"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-novo-militar" icon="save" loading={salvando} disabled={!dados}>Cadastrar</Button>
        </>
      )}
    >
      {falhaCarga ? (
        <p role="alert" className="text-sm font-semibold text-wine">{falhaCarga}</p>
      ) : !dados ? (
        <p className="py-6 text-center text-ink-3" role="status">Carregando listas de referência…</p>
      ) : (
        <form id="form-novo-militar" onSubmit={salvar} noValidate className="space-y-4">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <ChoiceGroup<Vinculo>
            label="Vínculo" required error={erros.vinculo} value={vinculo} onChange={escolherVinculo}
            options={[{ value: 'Carreira', label: 'Carreira' }, { value: 'Temporário', label: 'Temporário' }]}
          />

          {vinculo && (
            <Field label="Posto/Graduação" required error={erros.posto}>
              {a => (
                <select {...a} value={posto} onChange={e => escolherPosto(e.target.value)}>
                  <option value="">Selecione…</option>
                  {postos.map(p => <option key={p} value={p}>{p} — {dados.postos[p]?.nome}</option>)}
                </select>
              )}
            </Field>
          )}

          {categoria === 'Oficial' && (
            <Field label="Quadro" required error={erros.quadro}>
              {a => (
                <select {...a} value={quadroChave} onChange={e => { setQuadroChave(e.target.value); limpar('quadro'); }}>
                  <option value="">Selecione…</option>
                  {quadros.map(q => <option key={`${q.corpo.sigla}|${q.quadro.sigla}`} value={`${q.corpo.sigla}|${q.quadro.sigla}`}>{q.quadro.sigla} — {q.quadro.nome}</option>)}
                </select>
              )}
            </Field>
          )}

          {categoria === 'Praça' && (
            <>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={cpfn} onChange={e => { setCpfn(e.target.checked); setEspTexto(''); setEspSigla(''); }} className="w-5 h-5 accent-navy" />
                <span className="text-sm font-semibold text-ink">CPFN — Quadro de Praças de Fuzileiros Navais</span>
              </label>
              {especialidades.length > 0 ? (
                <Autocomplete
                  label="Especialidade" required error={erros.especialidade}
                  placeholder="Digite a sigla ou o nome da especialidade"
                  valor={espTexto} opcoes={opcoesEsp}
                  onDigitar={t => { setEspTexto(t); setEspSigla(''); limpar('especialidade'); }}
                  onSelecionar={o => { setEspTexto(`${o.principal} — ${o.secundaria}`); setEspSigla(o.principal); limpar('especialidade'); }}
                />
              ) : (
                <p className="text-xs text-ink-3">Este posto/graduação não tem especialidade.</p>
              )}
            </>
          )}

          <Field label="Nome completo" required error={erros.nome}>
            {a => <input {...a} type="text" value={nome} onChange={e => { setNome(e.target.value.toUpperCase()); limpar('nome'); }} className={`${a.className} uppercase`} autoComplete="off" />}
          </Field>

          <Field label="NIP" required error={erros.nip}>
            {a => <input {...a} type="text" inputMode="numeric" value={nip} onChange={e => { setNip(formatNip(e.target.value)); limpar('nip'); }} placeholder="00.0000.00" maxLength={10} className={`${a.className} font-mono`} />}
          </Field>

          <Autocomplete
            label="OM" required error={erros.om} help="Busque pela sigla ou pelo nome. Só a sigla é gravada."
            placeholder="Ex.: HNRe"
            valor={omTexto} opcoes={opcoesOm}
            onDigitar={t => { setOmTexto(t); setOmSigla(''); limpar('om'); }}
            onSelecionar={o => { setOmTexto(`${o.principal} — ${o.secundaria}`); setOmSigla(o.principal); limpar('om'); }}
          />

          <Field label="E-mail" help="Opcional.">
            {a => <input {...a} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />}
          </Field>

          {inspecionado && (
            <div className="bg-thead border border-line border-l-4 border-l-navy rounded-lg p-3">
              <p className="text-xs font-semibold text-ink-3">Inspecionado</p>
              <p className="text-sm font-bold text-navy break-words">{inspecionado}</p>
            </div>
          )}
        </form>
      )}
    </Drawer>
  );
};
