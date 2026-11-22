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
              ? <textarea {...aria} ref={el => { campos.current[c.chave] = el; }} rows={9} className="font-mono text-xs" value={valores[c.chave] ?? ''} onFocus={() => setFoco(c.chave)} onChange={e => mudar(c.chave, e.target.value)} />
              : <input {...aria} ref={el => { campos.current[c.chave] = el; }} type="text" value={valores[c.chave] ?? ''} onFocus={() => setFoco(c.chave)} onChange={e => mudar(c.chave, e.target.value)} />}
          </Field>
        ))}
        <div>
          <p className="text-xs font-semibold text-ink mb-1">Placeholders — toque para inserir no campo em edição</p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS_MSG[tipo].map(p => (
              <button key={p.chave} type="button" title={p.descricao} onClick={() => inserir(p.chave)}
                className="min-h-[32px] px-2 rounded-md border border-line bg-thead text-xs font-mono text-navy hover:bg-white">
                {`{{${p.chave}}}`}
              </button>
            ))}
          </div>
          <ul className="mt-2 text-xs text-ink-3 space-y-0.5">
            {PLACEHOLDERS_MSG[tipo].map(p => <li key={p.chave}><code className="font-mono text-ink">{`{{${p.chave}}}`}</code> — {p.descricao}</li>)}
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
      {!cru && !erro ? <p className="text-sm text-ink-3">Carregando…</p> : TIPOS_MODELO_MSG.map(t => <CartaoModelo key={t} tipo={t} cru={cru?.[t]} usuario={usuario} />)}
    </div>
  );
};
