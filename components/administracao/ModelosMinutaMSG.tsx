// Ficheiro: components/administracao/ModelosMinutaMSG.tsx
// Administração › Modelos de Minuta MSG: os 3 modelos de minuta (resultado, incapacidade definitiva para o SAM e
// cancelamento de IS) em texto com {{placeholders}}. Os chips inserem o placeholder no campo em edição; a prévia usa dados
// fictícios; "Restaurar padrão" volta ao texto original. Salvo em config/minutasMSG.{tipo} (utils/modelosMinutaMSG.ts).
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { NavContext } from '../../context/NavContext';
import { observarModelosMSG, salvarModeloMSG } from '../../services/modelosMinutaMSG';
import {
  CAMPOS_MODELO_MSG, MODELOS_MSG_PADRAO, PLACEHOLDERS_MSG, ROTULO_MODELO_MSG, TIPOS_MODELO_MSG,
  modeloComPadrao, placeholdersDesconhecidos, preencherModelo, type TipoModeloMSG,
} from '../../utils/modelosMinutaMSG';
import {
  CATALOGO_MINUTAS_MSG, ROTULO_GRUPO_MINUTA, minutaCatalogoComPadrao, placeholdersCatalogoDesconhecidos, placeholdersDaMinuta,
  type GrupoMinuta, type MinutaCatalogo,
} from '../../utils/catalogoMinutasMSG';
import { REGRAS_BENEFICIOS } from '../../utils/minutasBeneficiosPadrao';

type Valores = Record<string, string>;

const CartaoModelo: React.FC<{ tipo: TipoModeloMSG; cru: Record<string, unknown> | undefined; usuario: string }> = ({ tipo, cru, usuario }) => {
  const [valores, setValores] = useState<Valores>(() => modeloComPadrao(tipo, cru));
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null);
  const [foco, setFoco] = useState(CAMPOS_MODELO_MSG[tipo].at(-1)!.chave);
  const campos = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  useEffect(() => { if (!sujo) setValores(modeloComPadrao(tipo, cru)); }, [tipo, cru, sujo]);

  const mudar = (k: string, v: string) => { setValores(x => ({ ...x, [k]: v })); setSujo(true); setMsg(null); };
  const inserir = (chave: string) => {
    const el = campos.current[foco];
    const atual = valores[foco] ?? '';
    const ini = el?.selectionStart ?? atual.length;
    const fim = el?.selectionEnd ?? atual.length;
    const ins = `{{${chave}}}`;
    mudar(foco, atual.slice(0, ini) + ins + atual.slice(fim));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + ins.length, ini + ins.length); });
  };
  const desconhecidos = [...new Set(CAMPOS_MODELO_MSG[tipo].flatMap(c => placeholdersDesconhecidos(tipo, valores[c.chave] ?? '')))];
  const salvar = async () => {
    if (desconhecidos.length) { setMsg({ texto: `Placeholder desconhecido: ${desconhecidos.map(d => `{{${d}}}`).join(', ')}. Use só os da lista.`, erro: true }); return; }
    setSalvando(true); setMsg(null);
    try { await salvarModeloMSG(tipo, valores, usuario); setSujo(false); setMsg({ texto: 'Modelo salvo. Vale para as próximas minutas.' }); }
    catch (e) { setMsg({ texto: `Não foi possível salvar: ${(e as Error).message}`, erro: true }); }
    finally { setSalvando(false); }
  };
  const restaurar = () => { setValores({ ...MODELOS_MSG_PADRAO[tipo] }); setSujo(true); setMsg(null); };
  const exemplo = Object.fromEntries(PLACEHOLDERS_MSG[tipo].map(p => [p.chave, p.exemplo]));
  const previa = CAMPOS_MODELO_MSG[tipo].map(c => `${c.rotulo.split(' ')[0]}: ${preencherModelo(valores[c.chave] ?? '', exemplo)}`).join('\n\n');

  return (
    <Card as="section" title={ROTULO_MODELO_MSG[tipo].titulo}>
      <div className="space-y-3">
        <p className="text-xs text-ink-3">{ROTULO_MODELO_MSG[tipo].ajuda}</p>
        {CAMPOS_MODELO_MSG[tipo].map(c => (
          <Field key={c.chave} label={c.rotulo}>
            {aria => c.longo
              ? <textarea {...aria} ref={el => { campos.current[c.chave] = el; }} rows={9} className="text-xs" value={valores[c.chave] ?? ''} onFocus={() => setFoco(c.chave)} onChange={e => mudar(c.chave, e.target.value)} />
              : <input {...aria} ref={el => { campos.current[c.chave] = el; }} type="text" value={valores[c.chave] ?? ''} onFocus={() => setFoco(c.chave)} onChange={e => mudar(c.chave, e.target.value)} />}
          </Field>
        ))}
        <div>
          <p className="text-xs font-semibold text-ink mb-1">Placeholders — toque para inserir no campo em edição</p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS_MSG[tipo].map(p => (
              <button key={p.chave} type="button" title={p.descricao} onClick={() => inserir(p.chave)}
                className="min-h-[32px] px-2 rounded-md border border-line bg-thead text-xs text-navy hover:bg-white">
                {`{{${p.chave}}}`}
              </button>
            ))}
          </div>
          <ul className="mt-2 text-xs text-ink-3 space-y-0.5">
            {PLACEHOLDERS_MSG[tipo].map(p => <li key={p.chave}><code className="text-ink">{`{{${p.chave}}}`}</code> — {p.descricao}</li>)}
          </ul>
        </div>
        {desconhecidos.length > 0 && <p role="alert" className="text-xs text-wine">Placeholder desconhecido: {desconhecidos.map(d => `{{${d}}}`).join(', ')}</p>}
        <details className="rounded-lg border border-line p-2">
          <summary className="text-xs font-semibold text-ink cursor-pointer">Prévia com dados fictícios</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-ink font-sans">{previa}</pre>
        </details>
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" icon="save" loading={salvando} disabled={!sujo} onClick={() => void salvar()}>Salvar</Button>
          <Button size="sm" variant="ghost" icon="restart_alt" onClick={restaurar}>Restaurar padrão</Button>
        </div>
        {msg && <p role="status" className={`text-xs ${msg.erro ? 'text-wine' : 'text-ink-3'}`}>{msg.texto}</p>}
      </div>
    </Card>
  );
};

/** Minuta do catálogo (1 a 23): mesmos controles dos modelos em uso, com DE/PARA/INFO/ASSUNTO/TEXTO. */
const CartaoCatalogo: React.FC<{ m: MinutaCatalogo; cru: Record<string, unknown> | undefined; usuario: string }> = ({ m, cru, usuario }) => {
  const [valores, setValores] = useState<Valores>(() => minutaCatalogoComPadrao(m, cru));
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null);
  const [foco, setFoco] = useState('texto');
  const campos = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  useEffect(() => { if (!sujo) setValores(minutaCatalogoComPadrao(m, cru)); }, [m, cru, sujo]);
  const placeholders = placeholdersDaMinuta(m);

  const mudar = (k: string, v: string) => { setValores(x => ({ ...x, [k]: v })); setSujo(true); setMsg(null); };
  const inserir = (chave: string) => {
    const el = campos.current[foco];
    const atual = valores[foco] ?? '';
    const ini = el?.selectionStart ?? atual.length;
    const fim = el?.selectionEnd ?? atual.length;
    const ins = `{{${chave}}}`;
    mudar(foco, atual.slice(0, ini) + ins + atual.slice(fim));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + ins.length, ini + ins.length); });
  };
  const desconhecidos = [...new Set(m.campos.flatMap(c => placeholdersCatalogoDesconhecidos(valores[c.chave] ?? '')))];
  const salvar = async () => {
    if (desconhecidos.length) { setMsg({ texto: `Placeholder desconhecido: ${desconhecidos.map(d => `{{${d}}}`).join(', ')}. Use só os da lista.`, erro: true }); return; }
    setSalvando(true); setMsg(null);
    try { await salvarModeloMSG(m.chave, valores, usuario); setSujo(false); setMsg({ texto: 'Minuta salva.' }); }
    catch (e) { setMsg({ texto: `Não foi possível salvar: ${(e as Error).message}`, erro: true }); }
    finally { setSalvando(false); }
  };
  const exemplo = Object.fromEntries(placeholders.map(p => [p.chave, p.exemplo]));
  const previa = m.campos.map(c => `${c.rotulo}: ${preencherModelo(valores[c.chave] ?? '', exemplo)}`).join('\n\n');

  return (
    <details className="rounded-lg border border-line bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink min-h-[44px] flex items-center">{m.n}. {m.titulo}</summary>
      <div className="space-y-3 p-3 pt-1">
        <p className="text-xs text-ink-3">{m.ajuda}{m.roteamento ? ` ${m.roteamento}` : ''}</p>
        {m.campos.map(c => (
          <Field key={c.chave} label={c.rotulo}>
            {aria => c.longo
              ? <textarea {...aria} ref={el => { campos.current[c.chave] = el; }} rows={10} className="text-xs" value={valores[c.chave] ?? ''} onFocus={() => setFoco(c.chave)} onChange={e => mudar(c.chave, e.target.value)} />
              : <input {...aria} ref={el => { campos.current[c.chave] = el; }} type="text" value={valores[c.chave] ?? ''} onFocus={() => setFoco(c.chave)} onChange={e => mudar(c.chave, e.target.value)} />}
          </Field>
        ))}
        <div>
          <p className="text-xs font-semibold text-ink mb-1">Placeholders — toque para inserir no campo em edição</p>
          <div className="flex flex-wrap gap-1.5">
            {placeholders.map(p => (
              <button key={p.chave} type="button" title={p.descricao} onClick={() => inserir(p.chave)}
                className="min-h-[32px] px-2 rounded-md border border-line bg-thead text-xs text-navy hover:bg-white">{`{{${p.chave}}}`}</button>
            ))}
          </div>
        </div>
        {desconhecidos.length > 0 && <p role="alert" className="text-xs text-wine">Placeholder desconhecido: {desconhecidos.map(d => `{{${d}}}`).join(', ')}</p>}
        <details className="rounded-lg border border-line p-2">
          <summary className="text-xs font-semibold text-ink cursor-pointer">Prévia com dados fictícios</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-ink font-sans">{previa}</pre>
        </details>
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" icon="save" loading={salvando} disabled={!sujo} onClick={() => void salvar()}>Salvar</Button>
          <Button size="sm" variant="ghost" icon="restart_alt" onClick={() => { setValores({ ...m.padrao }); setSujo(true); setMsg(null); }}>Restaurar padrão</Button>
        </div>
        {msg && <p role="status" className={`text-xs ${msg.erro ? 'text-wine' : 'text-ink-3'}`}>{msg.texto}</p>}
      </div>
    </details>
  );
};

const GRUPOS: GrupoMinuta[] = ['gerais', 'ao', 'beneficios'];

/** Padrão comum das minutas de resultado de Benefícios: quem recebe e qual minuta usar. */
const PadraoBeneficios: React.FC = () => (
  <details className="rounded-lg border border-line bg-white">
    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink min-h-[44px] flex items-center">Padrão dos Benefícios (minutas 12 a 23)</summary>
    <div className="p-3 pt-1 space-y-2">
      <p className="text-xs text-ink-3">
        Todas têm a mesma estrutura — abertura com a data da APS e a conclusão, ALFA com o laudo e o TIS, BRAVO com a verificação do DS-1A. Só mudam o beneficiário
        (PARA/INFO, norma e qualificação) e o enquadramento (frases do laudo). Militar inativo enquadrado não tem resultado: usa a minuta 19 (auxílio-invalidez).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-ink-3"><th className="py-1 pr-2">Beneficiário</th><th className="pr-2">PARA</th><th className="pr-2">INFO</th><th className="pr-2">Não enquadra</th><th>Enquadra</th></tr></thead>
          <tbody>
            {REGRAS_BENEFICIOS.map(r => (
              <tr key={r.beneficiario} className="border-t border-line align-top">
                <td className="py-1 pr-2 text-ink">{r.rotulo}<span className="block text-ink-3">{r.norma}</span></td>
                <td className="pr-2">{r.para}</td><td className="pr-2">{r.info || '—'}</td><td className="pr-2 tabular-nums">nº {r.minutaNao}</td><td className="tabular-nums">nº {r.minutaSim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </details>
);

export const ModelosMinutaMSG: React.FC = () => {
  const nav = useContext(NavContext);
  const usuario = nav?.authUser?.usuario || '';
  const [cru, setCru] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => observarModelosMSG(setCru, e => setErro(e.message)), []);
  return (
    <div className="space-y-4 @container">
      <p className="text-sm text-ink-3">
        Modelos das Minutas MSG gerados na Ficha do inspecionado e na página Inspeções de Saúde. Use os placeholders {'{{assim}}'} para os dados da IS;
        campos vazios voltam ao texto padrão. Onde faltar dado, a minuta continua mostrando “[preencher: …]”.
      </p>
      {erro && <p className="text-sm text-wine">Erro ao carregar os modelos: {erro}</p>}
      {!cru && !erro ? <p className="text-sm text-ink-3">Carregando…</p> : (
        <>
          <h3 className="text-h3 text-ink">Em uso pelo app</h3>
          {TIPOS_MODELO_MSG.map(t => <CartaoModelo key={t} tipo={t} cru={cru?.[t]} usuario={usuario} />)}
          <h3 className="text-h3 text-ink pt-2">Catálogo de minutas (1 a 23)</h3>
          <p className="text-xs text-ink-3">Modelos de referência guardados e editáveis. Ainda não geram minutas sozinhos: os gatilhos entram aos poucos (os de Atestado de Origem, só com os AO no app web).</p>
          {GRUPOS.map(g => (
            <section key={g} className="space-y-2">
              <h4 className="text-sm font-semibold text-ink">{ROTULO_GRUPO_MINUTA[g].titulo}</h4>
              <p className="text-xs text-ink-3">{ROTULO_GRUPO_MINUTA[g].ajuda}</p>
              {g === 'beneficios' && <PadraoBeneficios />}
              {CATALOGO_MINUTAS_MSG.filter(m => m.grupo === g).map(m => <CartaoCatalogo key={m.chave} m={m} cru={cru?.[m.chave]} usuario={usuario} />)}
            </section>
          ))}
        </>
      )}
    </div>
  );
};
