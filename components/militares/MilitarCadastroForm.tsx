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
import { formatNip, formatCelular } from '../../utils/format';
import {
  carregarCorposQuadros, carregarOms, postosDoVinculo, quadrosDoOficial, especialidadesDaPraca, montarPgq, montarInspecionado, ehOficialMedico, omEhHnre, type SituacaoMilitar,
  type CorposQuadros, type OrganizacaoMilitar, type Vinculo,
} from '../../utils/corposQuadros';
import { InformacoesAdicionais, ADICIONAIS_VAZIO, adicionaisParaPatch, validarAdicionais, type Adicionais } from './InformacoesAdicionais';
import { criarMilitar, atualizarMilitar } from '../../services/firestoreMilitares';
import { enviarFotoMilitar } from '../../services/militarFoto';

interface Props {
  onClose: () => void;
  onCriado: (nome: string, id: string) => void;
}

type Erros = Record<string, string>;
type VinculoForm = Vinculo | 'Inativo';

export const MilitarCadastroForm: React.FC<Props> = ({ onClose, onCriado }) => {
  const [dados, setDados] = useState<CorposQuadros | null>(null);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [falhaCarga, setFalhaCarga] = useState('');

  const [vinculoSel, setVinculoSel] = useState<VinculoForm | ''>('');
  // Inativo usa os mesmos quadros/postos da Carreira; muda só a caixa RM1/Refº e o INSPECIONADO.
  const inativo = vinculoSel === 'Inativo';
  const vinculo: Vinculo | '' = inativo ? 'Carreira' : vinculoSel;
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
  const [celular, setCelular] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  // RM1 (reserva) e Refº (reformado): só vínculo Inativo, depois do posto; um exclui o outro.
  const [situacao, setSituacao] = useState<SituacaoMilitar>('');
  const [adicionais, setAdicionais] = useState<Adicionais>(ADICIONAIS_VAZIO);
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

  const escolherVinculo = (v: VinculoForm) => {
    setVinculoSel(v); setPosto(''); setQuadroChave(''); setCpfn(false); setEspTexto(''); setEspSigla(''); setSituacao(''); limpar('vinculo');
  };
  const escolherPosto = (p: string) => {
    setPosto(p); setQuadroChave(''); setCpfn(false); setEspTexto(''); setEspSigla(''); limpar('posto');
  };

  const pgq = categoria && posto
    ? montarPgq(categoria, posto, quadroEscolhido?.quadro.sigla ?? '', quadroEscolhido?.corpo.sigla ?? '', espSigla, situacao)
    : '';
  const nipCompleto = nip.length === 10;
  const hnre = omEhHnre(omSigla);
  const medico = hnre && ehOficialMedico(pgq);
  const inspecionado = pgq && nome.trim() ? montarInspecionado(pgq, nipCompleto ? nip : '', nome.trim().toUpperCase()) : '';

  const caixaSituacao = (valor: 'RM1' | 'Refº', dica: string) => (
    <label key={valor} className={`flex items-center gap-3 min-h-[44px] ${situacao && situacao !== valor ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox" checked={situacao === valor} disabled={!!situacao && situacao !== valor}
        onChange={() => { setSituacao(s => (s === valor ? '' : valor)); limpar('om'); limpar('situacao'); }}
        className="w-5 h-5 accent-navy"
      />
      <span className="text-sm font-semibold text-ink">{valor}</span>
      <span className="relative group inline-flex" tabIndex={0} aria-label={`${valor}: ${dica}`}>
        <span className="material-symbols-outlined text-[18px] text-ink-3" aria-hidden="true">help</span>
        <span role="tooltip" className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block group-focus:block whitespace-nowrap rounded bg-navy px-2 py-1 text-xs font-semibold text-white shadow-lg">{dica}</span>
      </span>
    </label>
  );
  // RM1/Refº aparecem só para vínculo Inativo, depois de escolhido o posto/graduação.
  const caixasSituacao = inativo && posto ? (
    <>
      {caixaSituacao('RM1', 'Reserva da Marinha de 1ª Classe')}
      {caixaSituacao('Refº', 'Reformado por idade-limite ou invalidez')}
      {erros.situacao && <p role="alert" className="w-full text-sm font-semibold text-wine">{erros.situacao}</p>}
    </>
  ) : null;

  const validar = (): Erros => {
    const e: Erros = {};
    if (!vinculo) e.vinculo = 'Escolha o vínculo.';
    if (vinculo && !posto) e.posto = 'Selecione o posto/graduação.';
    if (inativo && posto && !situacao) e.situacao = 'Marque RM1 ou Refº.';
    if (categoria === 'Oficial' && !quadroEscolhido) e.quadro = 'Selecione o quadro.';
    if (categoria === 'Praça' && especialidades.length > 0 && !espSigla) e.especialidade = 'Escolha a especialidade na lista.';
    if (!nome.trim()) e.nome = 'Informe o nome completo.';
    if (!nipCompleto) e.nip = 'Informe o NIP no formato 00.0000.00.';
    if (!omSigla && !situacao) e.om = 'Escolha a OM na lista.';
    if (celular && celular.replace(/\D/g, '').length < 10) e.celular = 'Informe o DDD e o número.';
    if (dataNascimento && dataNascimento > new Date().toISOString().slice(0, 10)) e.dataNascimento = 'A data não pode ser futura.';
    if (hnre) Object.assign(e, validarAdicionais(adicionais, medico));
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
      const extras = hnre ? adicionaisParaPatch(adicionais, medico) : {};
      const id = await criarMilitar({
        om: omSigla, temporario: vinculo === 'Temporário', pgq, nip, nome: nomeFinal,
        inspecionado: montarInspecionado(pgq, nip, nomeFinal), email: email.trim().toLowerCase(), ativo: true,
        celular: celular.replace(/\D/g, ''), dataNascimento, rm1: situacao === 'RM1', refo: situacao === 'Refº', ...extras,
      });
      onCriado(nomeFinal, id);
      if (medico && adicionais.fotoNova) {
        // O cadastro já existe; se a foto falhar, dá para enviá-la depois pela edição.
        enviarFotoMilitar(id, adicionais.fotoNova).then(url => atualizarMilitar(id, { fotoUrl: url })).catch(() => { /* foto pode ser reenviada na edição */ });
      }
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

          <ChoiceGroup<VinculoForm>
            label="Vínculo" required error={erros.vinculo} value={vinculo} onChange={escolherVinculo}
            options={[{ value: 'Carreira', label: 'Carreira' }, { value: 'Temporário', label: 'Temporário' }, { value: 'Inativo', label: 'Inativo' }]}
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

          {categoria === 'Oficial' && inativo && <div className="-mt-2">{caixasSituacao}</div>}

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
              {vinculo === 'Carreira' && (
                <div className="flex flex-wrap items-center gap-x-6">
                  <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={cpfn} onChange={e => { setCpfn(e.target.checked); setEspTexto(''); setEspSigla(''); }} className="w-5 h-5 accent-navy" />
                    <span className="text-sm font-semibold text-ink">CPFN</span>
                    <span className="relative group inline-flex" tabIndex={0} aria-label="CPFN: Quadro de Praças Fuzileiros Navais">
                      <span className="material-symbols-outlined text-[18px] text-ink-3" aria-hidden="true">help</span>
                      <span role="tooltip" className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block group-focus:block whitespace-nowrap rounded bg-navy px-2 py-1 text-xs font-semibold text-white shadow-lg">Quadro de Praças Fuzileiros Navais</span>
                    </span>
                  </label>
                  {caixasSituacao}
                </div>
              )}
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
            label="OM" required={!situacao} error={erros.om}
            placeholder="Ex.: HNRe"
            valor={omTexto} opcoes={opcoesOm}
            onDigitar={t => { setOmTexto(t); setOmSigla(''); limpar('om'); }}
            onSelecionar={o => { setOmTexto(`${o.principal} — ${o.secundaria}`); setOmSigla(o.principal); limpar('om'); }}
          />

          <Field label="E-mail">
            {a => <input {...a} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de nascimento" error={erros.dataNascimento}>
              {a => <input {...a} type="date" value={dataNascimento} onChange={e => { setDataNascimento(e.target.value); limpar('dataNascimento'); }} />}
            </Field>
            <Field label="Celular" error={erros.celular}>
              {a => <input {...a} type="tel" inputMode="numeric" placeholder="(00) 00000-0000" value={celular} onChange={e => { setCelular(formatCelular(e.target.value)); limpar('celular'); }} maxLength={15} autoComplete="off" />}
            </Field>
          </div>

          {hnre && <InformacoesAdicionais valor={adicionais} onChange={setAdicionais} medico={medico} erros={erros} />}

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
