// Ficheiro: components/administracao/EmailsAutomaticos.tsx
// Administração › E-mails automáticos (auditoria v3, 8b — CF1/CF3): um e-mail por vez — lista à esquerda,
// editor à direita (no celular, lista → editor com voltar) — no lugar da página longa de Configurações.
// "Enviar teste" fica no próprio e-mail; "quem alterou e quando" por item (config/emails.alteracoes e
// testesEnviados — services/configEmails.ts). "Geral" (Responder para e assinaturas) e os destinatários dos
// testes viram itens da lista (12 e-mails + Geral + Testes; com a lista longa, o editor fica fixo ao lado ao rolar).
// Grades por container (@container), não pela janela. O servidor lê o documento
// a cada envio (servidor/email/comum.ts): a mudança vale no próximo e-mail, sem publicar nada.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { StatusTag } from '../ui/StatusTag';
import { Toast } from '../ui/Toast';
import { NavContext } from '../../context/NavContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { ListaEmails } from '../configuracoes/ListaEmails';
import { BarraSalvar, type LinhaDiferenca } from './BarraSalvar';
import { useAvisoSaida } from './useAvisoSaida';
import { NoCorpo } from './NoCorpo';
import { marcarTesteEnviado, observarConfigEmails, salvarConfigEmails, type MarcaAlteracao, type MetaConfigEmails } from '../../services/configEmails';
import { enviarEmailTeste } from '../../services/emailTeste';
import { CONFIG_EMAILS_PADRAO, TIPOS_EMAIL, type ConfigEmails, type DestinatariosEmail, type TipoEmail } from '../../config/emails';
import { errosConfigEmails } from '../../utils/configuracoes';
import { dataHoraCurta, diferencaLista, plural } from '../../utils/administracao';

const CAMPOS: { chave: keyof DestinatariosEmail; rotulo: string }[] = [
  { chave: 'para', rotulo: 'Para' },
  { chave: 'cc', rotulo: 'Cópia (CC)' },
  { chave: 'cco', rotulo: 'Cópia oculta (CCO)' },
];

type Item = TipoEmail | 'geral' | 'testes';

const ROTULO_ITEM: Record<Item, string> = {
  ...(Object.fromEntries(TIPOS_EMAIL.map(t => [t.tipo, t.rotulo])) as Record<TipoEmail, string>),
  geral: 'Geral',
  testes: 'Destinatários dos testes',
};

const lista = (l: string[]) => (l.length ? l.join(', ') : '—');

/** Diferenças por item (rótulo "Item › campo"). */
const diferencasDoItem = (item: Item, salvo: ConfigEmails, r: ConfigEmails): LinhaDiferenca[] => {
  const linhas: LinhaDiferenca[] = [];
  const texto = (rotulo: string, a: string, b: string) => { if (a !== b) linhas.push({ rotulo: `${ROTULO_ITEM[item]} › ${rotulo}`, antes: a || '—', depois: b || '—' }); };
  const listas = (rotulo: string, a: string[], b: string[]) => {
    const d = diferencaLista(a, b);
    if (d.incluidos.length || d.removidos.length) linhas.push({ rotulo: `${ROTULO_ITEM[item]} › ${rotulo}`, antes: lista(a), depois: lista(b) });
  };
  if (item === 'geral') {
    texto('Responder para', salvo.responderPara, r.responderPara);
    texto('Presidente — nome', salvo.assinatura.presidenteNome, r.assinatura.presidenteNome);
    texto('Presidente — posto', salvo.assinatura.presidentePosto, r.assinatura.presidentePosto);
    texto('Supervisor — nome', salvo.assinatura.supervisorNome, r.assinatura.supervisorNome);
    texto('Supervisor — posto/graduação', salvo.assinatura.supervisorPosto, r.assinatura.supervisorPosto);
    texto('Supervisor — cargo', salvo.assinatura.supervisorCargo, r.assinatura.supervisorCargo);
  } else if (item === 'testes') {
    listas('Para', salvo.testes.para, r.testes.para);
    listas('Cópia (CC)', salvo.testes.cc, r.testes.cc);
  } else {
    CAMPOS.forEach(c => listas(c.rotulo, salvo.destinatarios[item][c.chave], r.destinatarios[item][c.chave]));
    if (item === 'faltasHNRe') texto('Saudação', salvo.saudacaoFaltasHNRe, r.saudacaoFaltasHNRe);
    if (item === 'nac') texto('Saudação', salvo.saudacaoNac, r.saudacaoNac);
  }
  return linhas;
};

const ITENS: Item[] = [...TIPOS_EMAIL.map(t => t.tipo), 'geral', 'testes'];

const marcaTexto = (m: MarcaAlteracao | undefined | null) => (m ? `${m.por || 'Admin'} em ${dataHoraCurta(m.em)}` : '');

export const EmailsAutomaticos: React.FC = () => {
  const nav = useContext(NavContext);
  const isDesktop = useIsDesktop();
  const [salvo, setSalvo] = useState<ConfigEmails | null>(null);
  const [meta, setMeta] = useState<MetaConfigEmails | null>(null);
  const [rascunho, setRascunho] = useState<ConfigEmails | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState<TipoEmail | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [item, setItem] = useState<Item>(TIPOS_EMAIL[0].tipo);
  // Celular: lista primeiro; tocar num e-mail abre o editor (com voltar).
  const [editorAberto, setEditorAberto] = useState(false);

  useEffect(() => observarConfigEmails(
    (c, m) => { setSalvo(c); setMeta(m); setRascunho(r => (r === null ? c : r)); },
    () => setErroCarga('Não foi possível carregar as configurações dos e-mails.'),
  ), []);

  const difsPorItem = useMemo(() => {
    const r: Partial<Record<Item, LinhaDiferenca[]>> = {};
    if (salvo && rascunho) ITENS.forEach(i => { const d = diferencasDoItem(i, salvo, rascunho); if (d.length) r[i] = d; });
    return r;
  }, [salvo, rascunho]);
  const todas = ITENS.flatMap(i => difsPorItem[i] || []);
  const descartar = () => { if (salvo) setRascunho(salvo); };
  const aviso = useAvisoSaida(todas.length > 0, descartar);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  if (!rascunho || !salvo) {
    return <p className={`text-sm ${erroCarga ? 'font-semibold text-wine' : 'text-ink-3'}`}>{erroCarga || 'Carregando…'}</p>;
  }

  const erros = errosConfigEmails(rascunho);
  const temErro = Object.keys(erros).length > 0;
  const itensAlterados = ITENS.filter(i => difsPorItem[i]);
  const resumo = (() => {
    if (!todas.length) return '';
    if (itensAlterados.length === 1) {
      const d = difsPorItem[itensAlterados[0]]!;
      const campos = d.map(x => x.rotulo.split(' › ')[1]).filter(Boolean);
      return `${plural(d.length, 'alteração não salva', 'alterações não salvas')} em ${ROTULO_ITEM[itensAlterados[0]]}${campos.length ? ` (${campos.join(', ')})` : ''}`;
    }
    return `${plural(todas.length, 'alteração não salva', 'alterações não salvas')} em ${itensAlterados.length} e-mails`;
  })();

  const setLista = (tipo: TipoEmail, chave: keyof DestinatariosEmail, l: string[]) =>
    setRascunho(r => r && ({ ...r, destinatarios: { ...r.destinatarios, [tipo]: { ...r.destinatarios[tipo], [chave]: l } } }));
  const restaurar = (tipo: TipoEmail) =>
    setRascunho(r => r && ({ ...r, destinatarios: { ...r.destinatarios, [tipo]: { ...CONFIG_EMAILS_PADRAO.destinatarios[tipo] } } }));
  const ehPadrao = (tipo: TipoEmail) => JSON.stringify(rascunho.destinatarios[tipo]) === JSON.stringify(CONFIG_EMAILS_PADRAO.destinatarios[tipo]);

  const usuario = nav?.authUser?.usuario || '';
  const salvar = async () => {
    if (temErro) return false;
    setSalvando(true);
    try {
      await salvarConfigEmails(rascunho, usuario, itensAlterados, todas.map(d => d.rotulo));
      setSalvo(rascunho);
      avisar('E-mails salvos. Valem a partir do próximo e-mail enviado.');
      return true;
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível salvar as configurações.', 'error');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const testar = async (tipo: TipoEmail) => {
    setTestando(tipo);
    try {
      const r = await enviarEmailTeste(tipo);
      void marcarTesteEnviado(tipo, usuario);
      avisar(`E-mail de teste enviado para ${[...r.para, ...r.cc].join(', ')}.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível enviar o e-mail de teste.', 'error');
    } finally {
      setTestando(null);
    }
  };

  const escolher = (i: Item) => { setItem(i); setEditorAberto(true); };

  const subtitulo = (i: Item): string => {
    if (i === 'geral') return 'Responder para · assinaturas';
    if (i === 'testes') return `${plural(rascunho.testes.para.length + rascunho.testes.cc.length, 'destinatário', 'destinatários')} · sem CCO`;
    const d = rascunho.destinatarios[i];
    const n = d.para.length + d.cc.length + d.cco.length;
    return `${plural(n, 'fixo', 'fixos')}${TIPOS_EMAIL.find(t => t.tipo === i)?.dinamicos === 'Nenhum.' ? '' : ' + automáticos'}`;
  };

  const listaItens = (
    <Card padding="none" as="section" title="E-mails" aria-label="E-mails automáticos">
      <ul className="divide-y divide-line border-t border-line">
        {ITENS.map(i => {
          const ativo = (isDesktop || editorAberto) && item === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => escolher(i)}
                aria-current={ativo ? 'true' : undefined}
                className={`relative w-full text-left px-4 py-2.5 min-h-[44px] flex items-center gap-2 transition-colors ${ativo ? 'bg-thead' : 'hover:bg-thead'}`}
              >
                {ativo && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-gold rounded-r-full" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${ativo ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{ROTULO_ITEM[i]}</span>
                  <span className="block text-xs text-ink-3 truncate">{subtitulo(i)}</span>
                </span>
                {difsPorItem[i] && <StatusTag tone="attention">alterado</StatusTag>}
                <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">chevron_right</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );

  const tipoDef = TIPOS_EMAIL.find(t => t.tipo === item);
  const rodapeMeta = (m: string, extra?: React.ReactNode) => (
    <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-ink-3">{m || 'Ainda não alterado pelo app (valores padrão ou de antes do registro).'}</p>
      {extra}
    </div>
  );

  const editor = (() => {
    if (item === 'geral') {
      return (
        <Card as="section" title="Geral" titleAs="h2">
          <p className="text-sm text-ink-3 mb-4">Valem para todos os e-mails.</p>
          <div className="@container">
            <div className="grid gap-4 @[36rem]:grid-cols-2">
              <Field label="Responder para (Reply-To)" required error={erros.responderPara} className="@[36rem]:col-span-2">
                {a => <input {...a} type="email" value={rascunho.responderPara} onChange={e => setRascunho({ ...rascunho, responderPara: e.target.value.trim().toLowerCase() })} />}
              </Field>
              <Field label="Presidente da JRS — nome completo" required error={erros.presidenteNome} help="Última assinatura de todos os e-mails.">
                {a => <input {...a} value={rascunho.assinatura.presidenteNome} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, presidenteNome: e.target.value } })} />}
              </Field>
              <Field label="Presidente da JRS — posto" required error={erros.presidentePosto}>
                {a => <input {...a} value={rascunho.assinatura.presidentePosto} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, presidentePosto: e.target.value } })} />}
              </Field>
              <Field label="Supervisor — nome completo" required error={erros.supervisorNome}>
                {a => <input {...a} value={rascunho.assinatura.supervisorNome} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, supervisorNome: e.target.value } })} />}
              </Field>
              <Field label="Supervisor — posto/graduação" required error={erros.supervisorPosto}>
                {a => <input {...a} value={rascunho.assinatura.supervisorPosto} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, supervisorPosto: e.target.value } })} />}
              </Field>
              <Field label="Supervisor — cargo" required error={erros.supervisorCargo}>
                {a => <input {...a} value={rascunho.assinatura.supervisorCargo} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, supervisorCargo: e.target.value } })} />}
              </Field>
            </div>
          </div>
          <p className="text-xs text-ink-3 mt-4">A primeira assinatura ("Por ordem de:") é a de quem envia o e-mail, com o nome, o posto e o cargo do cadastro em Usuários; não aparece quando quem envia é o Admin. No e-mail interno das IS agendadas (18h ou envio manual), as assinaturas são fixas: Supervisor e Presidente.</p>
          {rodapeMeta(meta?.alteracoes.geral ? `Alterado por ${marcaTexto(meta.alteracoes.geral)}` : '')}
        </Card>
      );
    }
    if (item === 'testes') {
      return (
        <Card as="section" title="Destinatários dos testes" titleAs="h2">
          <p className="text-sm text-ink-3 mb-4">"Enviar teste" (em cada e-mail) manda o e-mail com dados fictícios, pelos mesmos modelos do envio real, só para estes destinatários (sem cópia oculta). O assunto leva "[TESTE]". Nenhuma IS, candidato ou cadastro é alterado.</p>
          <div className="@container">
            <div className="grid gap-4 @[36rem]:grid-cols-2 items-start">
              <div>
                <ListaEmails rotulo="Para" emails={rascunho.testes.para} onChange={l => setRascunho({ ...rascunho, testes: { ...rascunho.testes, para: l } })} />
                {erros.testesPara && <p role="alert" className="text-xs font-semibold text-wine mt-1">{erros.testesPara}</p>}
              </div>
              <ListaEmails rotulo="Cópia (CC)" emails={rascunho.testes.cc} onChange={l => setRascunho({ ...rascunho, testes: { ...rascunho.testes, cc: l } })} />
            </div>
          </div>
          {rodapeMeta(meta?.alteracoes.testes ? `Alterado por ${marcaTexto(meta.alteracoes.testes)}` : '')}
        </Card>
      );
    }
    const t = tipoDef!;
    const alterado = meta?.alteracoes[t.tipo];
    const teste = meta?.testesEnviados[t.tipo];
    const marcaLinha = [alterado ? `Alterado por ${marcaTexto(alterado)}` : '', teste ? `teste enviado em ${dataHoraCurta(teste.em)}` : ''].filter(Boolean).join(' · ');
    return (
      <Card
        as="section"
        titleAs="h2"
        title={t.rotulo}
        actions={<Button size="sm" variant="secondary" icon="send" loading={testando === t.tipo} disabled={!!testando || todas.length > 0} onClick={() => testar(t.tipo)}>Enviar teste</Button>}
      >
        <p className="text-sm text-ink-3 -mt-2 mb-4">Assunto: <strong className="text-ink">{t.assunto}</strong>{todas.length > 0 && <span className="block text-xs mt-1">Salve as alterações para enviar um teste.</span>}</p>
        <div className="space-y-3">
          {CAMPOS.map(c => (
            <ListaEmails key={c.chave} rotulo={c.rotulo} emails={rascunho.destinatarios[t.tipo][c.chave]} onChange={l => setLista(t.tipo, c.chave, l)} />
          ))}
        </div>
        <p className="text-xs text-ink-3 mt-3 flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-navy" aria-hidden="true">auto_awesome</span>
          <span><strong>Acrescentados automaticamente:</strong> {t.dinamicos}</span>
        </p>
        {t.tipo === 'faltasHNRe' && (
          <Field label="Saudação" required error={erros.saudacaoFaltasHNRe} className="mt-4" help="Primeira linha do e-mail (encarregada da Divisão de Pessoal do HNRe).">
            {a => <input {...a} value={rascunho.saudacaoFaltasHNRe} onChange={e => setRascunho({ ...rascunho, saudacaoFaltasHNRe: e.target.value })} />}
          </Field>
        )}
        {t.tipo === 'nac' && (
          <Field label="Saudação" required error={erros.saudacaoNac} className="mt-4" help="Primeira linha do e-mail (encarregada do NAC).">
            {a => <input {...a} value={rascunho.saudacaoNac} onChange={e => setRascunho({ ...rascunho, saudacaoNac: e.target.value })} />}
          </Field>
        )}
        {rodapeMeta(marcaLinha, <Button size="sm" variant="ghost" icon="restart_alt" disabled={ehPadrao(t.tipo)} onClick={() => restaurar(t.tipo)}>Restaurar padrões</Button>)}
      </Card>
    );
  })();

  return (
    <div>
      <NoCorpo><Toast message={toast?.msg ?? null} tone={toast?.tone} /></NoCorpo>
      {aviso}
      <p className="text-sm text-ink-3 mb-4">Destinatários fixos de cada e-mail. Os que dependem da IS ou dos usuários são acrescentados pelo servidor. Depois de salvar, a mudança vale no próximo e-mail, sem publicar nada.</p>
      {isDesktop ? (
        <div className="@container">
          <div className="grid gap-4 @[42rem]:grid-cols-[16rem_minmax(0,1fr)] items-start">
            {listaItens}
            {/* Lista longa (12 e-mails + Geral + Testes): o editor acompanha a rolagem ao lado dela. */}
            <div className="min-w-0 @[42rem]:sticky @[42rem]:top-4">{editor}</div>
          </div>
        </div>
      ) : editorAberto ? (
        <div>
          <Button variant="ghost" icon="arrow_back" onClick={() => setEditorAberto(false)} className="mb-3 -ml-2">Todos os e-mails</Button>
          {editor}
        </div>
      ) : listaItens}
      <BarraSalvar
        resumo={resumo}
        diferencas={todas}
        onDescartar={descartar}
        onSalvar={salvar}
        salvando={salvando}
        bloqueio={temErro ? 'Corrija os campos obrigatórios antes de salvar.' : undefined}
        aviso="O servidor lê esta configuração a cada envio: vale a partir do próximo e-mail."
      />
    </div>
  );
};
