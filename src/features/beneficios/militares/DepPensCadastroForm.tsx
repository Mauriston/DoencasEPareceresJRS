// Ficheiro: components/militares/DepPensCadastroForm.tsx
// Aba "Dep/Pens." do cadastro de inspecionados. O primeiro campo escolhe entre Dependente e
// Pensionista; o restante do formulário depende dessa escolha:
//  - Dependente: Titular (autocomplete na base de militares; se não achar, "Cadastrar novo" abre o
//    formulário de militar) → Nome → NIP → OM (preenchida com a OM do titular).
//    INSPECIONADO = DEP-{posto do titular} {NIP} {NOME}.
//  - Pensionista: Nome → NIP → Posto/Graduação (menu suspenso).
//    INSPECIONADO = PENS-{posto} {NIP} {NOME}.
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Autocomplete, type OpcaoAutocomplete } from '@/components/ui/Autocomplete';
import { MilitarCadastroForm } from './MilitarCadastroForm';
import { formatNip } from '@/utils/format';
import { carregarCorposQuadros, montarInspecionado, normalizarBusca, separarPosto, type CorposQuadros, type PostoInfo } from '@/utils/corposQuadros';
import { criarMilitar, observarMilitares, tipoDoInspecionado, type MilitarRecord } from '@/services/firestoreMilitares';

interface Props {
  onClose: () => void;
  onCriado: (nome: string, id: string) => void;
  tabs?: React.ReactNode;
}

type Subtipo = 'dependente' | 'pensionista';
type Erros = Record<string, string>;

export const DepPensCadastroForm: React.FC<Props> = ({ onClose, onCriado, tabs }) => {
  const [subtipo, setSubtipo] = useState<Subtipo | ''>('');
  const [dados, setDados] = useState<CorposQuadros | null>(null);
  const [falhaCarga, setFalhaCarga] = useState('');
  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [titular, setTitular] = useState<MilitarRecord | null>(null);
  const [titularTexto, setTitularTexto] = useState('');
  const [cadastrandoTitular, setCadastrandoTitular] = useState(false);
  const [recemCadastradoId, setRecemCadastradoId] = useState('');
  const [nome, setNome] = useState('');
  const [nip, setNip] = useState('');
  const [posto, setPosto] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarCorposQuadros().then(setDados).catch(e => setFalhaCarga(e?.message || 'Não foi possível carregar as listas de referência.')); }, []);
  useEffect(() => observarMilitares(setMilitares), []);

  const limpar = (k: string) => setErros(er => (er[k] ? { ...er, [k]: '' } : er));

  // O titular é sempre um militar (não dependente nem pensionista).
  const titulares = useMemo(() => militares.filter(m => tipoDoInspecionado(m) === 'militar'), [militares]);
  const opcoesTitular: OpcaoAutocomplete[] = useMemo(() => titulares.map(m => ({
    chave: m.id, principal: m.nome, secundaria: `${m.pgq} · ${formatNip(m.nip)} · ${m.om}`,
    busca: normalizarBusca(`${m.inspecionado} ${m.om} ${m.id}`),
  })), [titulares]);

  // Titular recém-cadastrado: assim que aparece na lista, já vem selecionado.
  useEffect(() => {
    if (!recemCadastradoId) return;
    const m = titulares.find(x => x.id === recemCadastradoId);
    if (m) { setTitular(m); setTitularTexto(m.inspecionado); setRecemCadastradoId(''); limpar('titular'); }
  }, [recemCadastradoId, titulares]);

  const postosOrdenados = useMemo(
    () => dados ? (Object.entries(dados.postos) as [string, PostoInfo][]).sort((a, b) => a[1].ordem - b[1].ordem).map(([sigla, info]) => ({ sigla, ...info })) : [],
    [dados],
  );

  const postoTitular = titular && dados ? (separarPosto(titular.pgq, dados.postos)?.posto ?? titular.pgq) : '';
  const pgq = subtipo === 'dependente' ? (postoTitular ? `DEP-${postoTitular}` : '') : subtipo === 'pensionista' && posto ? `PENS-${posto}` : '';
  const nomeFinal = nome.trim().toUpperCase();
  const inspecionado = pgq && nomeFinal ? montarInspecionado(pgq, nip.length === 10 ? nip : '', nomeFinal) : '';

  const escolherSubtipo = (v: Subtipo) => { setSubtipo(v); setErros({}); limpar('subtipo'); };

  const validar = (): Erros => {
    const e: Erros = {};
    if (!subtipo) e.subtipo = 'Escolha Dependente ou Pensionista.';
    if (subtipo === 'dependente' && !titular) e.titular = 'Escolha o titular na lista.';
    if (subtipo && !nomeFinal) e.nome = 'Informe o nome completo.';
    if (subtipo && nip.length !== 10) e.nip = 'Informe o NIP no formato 00.0000.00.';
    if (subtipo === 'pensionista' && !posto) e.posto = 'Selecione o posto/graduação.';
    return e;
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#form-novo-deppens [aria-invalid="true"]')?.focus());
      return;
    }
    if (!subtipo) return;
    setSalvando(true);
    try {
      const base = { temporario: false, pgq, nip, nome: nomeFinal, inspecionado: montarInspecionado(pgq, nip, nomeFinal), email: '', ativo: true, tipo: subtipo };
      const id = await criarMilitar(subtipo === 'dependente' && titular
        ? { ...base, om: titular.om, titularId: titular.id, titularNome: titular.nome, titularPosto: postoTitular }
        : { ...base, om: '' });
      onCriado(nomeFinal, id);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível cadastrar o inspecionado.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Drawer
        title="Cadastrar novo inspecionado"
        icon="person_add"
        onClose={onClose}
        footer={(
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="form-novo-deppens" icon="save" loading={salvando} disabled={!dados || !subtipo}>Cadastrar</Button>
          </>
        )}
      >
        {tabs && <div className="mb-4">{tabs}</div>}
        {falhaCarga ? (
          <p role="alert" className="text-sm font-semibold text-wine">{falhaCarga}</p>
        ) : !dados ? (
          <p className="py-6 text-center text-ink-3" role="status">Carregando listas de referência…</p>
        ) : (
          <form id="form-novo-deppens" onSubmit={salvar} noValidate className="space-y-4">
            {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

            <ChoiceGroup<Subtipo>
              label="Tipo" required error={erros.subtipo} value={subtipo} onChange={escolherSubtipo}
              options={[{ value: 'dependente', label: 'Dependente' }, { value: 'pensionista', label: 'Pensionista' }]}
            />

            {subtipo === 'dependente' && (
              <Autocomplete
                label="Titular" required error={erros.titular}
                placeholder="Digite o nome, o NIP ou a OM do militar titular"
                valor={titularTexto} opcoes={opcoesTitular}
                onDigitar={t => { setTitularTexto(t); setTitular(null); limpar('titular'); }}
                onSelecionar={o => { const m = titulares.find(x => x.id === o.chave); if (m) { setTitular(m); setTitularTexto(m.inspecionado); limpar('titular'); } }}
                aoNaoEncontrar={{ rotulo: 'Cadastrar novo', onClick: () => setCadastrandoTitular(true) }}
              />
            )}

            {subtipo && (
              <>
                <Field label={subtipo === 'dependente' ? 'Nome do dependente' : 'Nome completo'} required error={erros.nome}>
                  {a => <input {...a} type="text" value={nome} onChange={e => { setNome(e.target.value.toUpperCase()); limpar('nome'); }} className={`${a.className} uppercase`} autoComplete="off" />}
                </Field>

                <Field label="NIP" required error={erros.nip}>
                  {a => <input {...a} type="text" inputMode="numeric" value={nip} onChange={e => { setNip(formatNip(e.target.value)); limpar('nip'); }} placeholder="00.0000.00" maxLength={10} className={`${a.className} font-mono`} />}
                </Field>
              </>
            )}

            {subtipo === 'dependente' && (
              <Field label="OM" help="Preenchida automaticamente com a OM do titular.">
                {a => <input {...a} type="text" value={titular?.om ?? ''} readOnly disabled placeholder="Escolha o titular" />}
              </Field>
            )}

            {subtipo === 'pensionista' && (
              <Field label="Posto/Graduação" required error={erros.posto}>
                {a => (
                  <select {...a} value={posto} onChange={e => { setPosto(e.target.value); limpar('posto'); }}>
                    <option value="">Selecione…</option>
                    {['Oficial', 'Praça', 'Servidor Civil'].map(cat => (
                      <optgroup key={cat} label={cat}>
                        {postosOrdenados.filter(p => p.categoria === cat).map(p => <option key={p.sigla} value={p.sigla}>{p.sigla} — {p.nome}</option>)}
                      </optgroup>
                    ))}
                  </select>
                )}
              </Field>
            )}

            {inspecionado && (
              <div className="bg-thead border border-line border-l-4 border-l-navy rounded-lg p-3">
                <p className="text-xs font-semibold text-ink-3">Inspecionado</p>
                <p className="text-sm font-bold text-navy break-words">{inspecionado}</p>
              </div>
            )}
          </form>
        )}
      </Drawer>

      {cadastrandoTitular && (
        <MilitarCadastroForm
          onClose={() => setCadastrandoTitular(false)}
          onCriado={(_nome, id) => { setCadastrandoTitular(false); setRecemCadastradoId(id); }}
        />
      )}
    </>
  );
};
