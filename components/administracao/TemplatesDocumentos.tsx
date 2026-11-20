// Ficheiro: components/administracao/TemplatesDocumentos.tsx
// Administração › Templates de documentos: os 5 documentos gerados a partir de uma IS ("Gerar Documento ▾" da
// Ficha). Por template, ajustes editáveis (títulos, textos fixos, corpo com {{placeholders}}) gravados em
// config/documentosIS.{tipo} (esquema/padrões em utils/ajustesDocumentosIS.ts; lidos pelos geradores em
// servidor/documentos/is/) e "Gerar teste": PDF com dados fictícios em testes/documentosIS/, apagado após 30 min.
import { abrirPdf } from '../../services/abrirPdf';
import React, { useContext, useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { NavContext } from '../../context/NavContext';
import { TIPOS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS, type TipoDocumentoIS } from '../../utils/documentosIS';
import { AJUSTES_PADRAO_DOCUMENTOS_IS, CAMPOS_AJUSTES_DOCUMENTOS_IS } from '../../utils/ajustesDocumentosIS';
import { observarAjustesDocumentosIS, salvarAjustesDocumentoIS, gerarDocumentoISTeste } from '../../services/documentosIS';

type Valores = Record<string, string>;

const valoresDe = (tipo: TipoDocumentoIS, cru: Record<string, unknown> | undefined): Valores => {
  const padrao = AJUSTES_PADRAO_DOCUMENTOS_IS[tipo] as unknown as Valores;
  const out: Valores = {};
  for (const k of Object.keys(padrao)) out[k] = typeof cru?.[k] === 'string' ? String(cru[k]) : padrao[k];
  return out;
};

const CartaoTemplate: React.FC<{ tipo: TipoDocumentoIS; cru: Record<string, unknown> | undefined; usuario: string }> = ({ tipo, cru, usuario }) => {
  const [valores, setValores] = useState<Valores>(() => valoresDe(tipo, cru));
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null);
  useEffect(() => { if (!sujo) setValores(valoresDe(tipo, cru)); }, [tipo, cru, sujo]);

  const mudar = (k: string, v: string) => { setValores(x => ({ ...x, [k]: v })); setSujo(true); };
  const salvar = async () => {
    setSalvando(true); setMsg(null);
    try { await salvarAjustesDocumentoIS(tipo, valores, usuario); setSujo(false); setMsg({ texto: 'Ajustes salvos.' }); }
    catch (e) { setMsg({ texto: `Não foi possível salvar: ${(e as Error).message}`, erro: true }); }
    finally { setSalvando(false); }
  };
  const restaurar = () => { setValores({ ...(AJUSTES_PADRAO_DOCUMENTOS_IS[tipo] as unknown as Valores) }); setSujo(true); };
  const gerarTeste = async () => {
    // Abre a aba já no clique (senão o bloqueador de pop-ups barra o window.open depois do await).
    setGerando(true); setMsg(null);
    try {
      await abrirPdf(async () => (await gerarDocumentoISTeste(tipo)).pdfUrl);
      setMsg({ texto: 'PDF de teste gerado (usa os ajustes SALVOS). Ele é apagado automaticamente após 30 minutos.' });
    } catch (e) {
      setMsg({ texto: `Falha ao gerar o teste: ${(e as Error).message}`, erro: true });
    } finally { setGerando(false); }
  };

  return (
    <Card as="section" title={ROTULO_DOCUMENTO_IS[tipo]}>
      <div className="space-y-3">
        {CAMPOS_AJUSTES_DOCUMENTOS_IS[tipo].map(c => (
          <Field key={c.chave} label={c.rotulo} help={c.ajuda ? `Campos: ${c.ajuda}` : undefined}>
            {aria => c.longo
              ? <textarea {...aria} rows={4} value={valores[c.chave] ?? ''} onChange={e => mudar(c.chave, e.target.value)} />
              : <input {...aria} type="text" value={valores[c.chave] ?? ''} onChange={e => mudar(c.chave, e.target.value)} />}
          </Field>
        ))}
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" icon="save" loading={salvando} disabled={!sujo} onClick={() => void salvar()}>Salvar</Button>
          <Button size="sm" variant="ghost" icon="restart_alt" onClick={restaurar}>Restaurar padrão</Button>
          <Button size="sm" variant="secondary" icon="science" loading={gerando} onClick={() => void gerarTeste()}>Gerar teste</Button>
        </div>
        {msg && <p role="status" className={`text-xs ${msg.erro ? 'text-wine' : 'text-ink-3'}`}>{msg.texto}</p>}
      </div>
    </Card>
  );
};

export const TemplatesDocumentos: React.FC = () => {
  const nav = useContext(NavContext);
  const usuario = nav?.authUser?.usuario || '';
  const [cru, setCru] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => observarAjustesDocumentosIS(setCru, e => setErro(e.message)), []);
  return (
    <div className="space-y-4 @container">
      <p className="text-sm text-ink-3">
        Ajustes dos documentos gerados pela Ficha do inspecionado (Gerar Documento ▾). Campos vazios usam o texto padrão.
        “Gerar teste” usa dados fictícios e abre o PDF em nova aba; os PDFs de teste são apagados automaticamente após 30 minutos.
      </p>
      {erro && <p className="text-sm text-wine">Erro ao carregar os ajustes: {erro}</p>}
      {!cru && !erro ? <p className="text-sm text-ink-3">Carregando…</p> : TIPOS_DOCUMENTO_IS.map(t => <CartaoTemplate key={t} tipo={t} cru={cru?.[t]} usuario={usuario} />)}
    </div>
  );
};
