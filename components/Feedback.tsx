// Ficheiro: components/Feedback.tsx
// Página "Feedback" (menu lateral › Ajuda, abaixo de "Sobre o app"):
//  - usuários: formulário em 3 passos curtos, no padrão dos apps de mercado — tipo (Problema · Sugestão ·
//    Elogio, em cartões), para Problema a página onde ocorreu (só as que o perfil acessa) e o impacto, e a
//    descrição. Ao enviar, o servidor registra e manda o e-mail de agradecimento (servidor/feedback/feedback.ts);
//  - Admin: a lista recebida, por tipo (abas com o número de pendentes), com "Lido" (sugestão/elogio) e
//    "Solucionado" (problema — envia ao usuário o e-mail de solução com a página e o relato).
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Field, controlClass } from './ui/Field';
import { ChoiceGroup } from './ui/ChoiceGroup';
import { Segmented } from './ui/Segmented';
import { EmptyState } from './ui/EmptyState';
import { StatusTag } from './ui/StatusTag';
import { Toast } from './ui/Toast';
import { useNav } from '../context/NavContext';
import { PAGE_DEFS, canAccessPage } from '../config/permissions';
import {
  IMPACTOS, MAX_MENSAGEM, MIN_MENSAGEM, PAGINA_GERAL, ROTULO_PAGINA_GERAL, TIPOS_FEEDBACK,
  dataHoraRecife, erroFeedback, feedbackConcluido, rotuloImpacto, type ImpactoProblema, type TipoFeedback,
} from '../utils/feedback';
import { enviarFeedback, marcarFeedback, observarFeedbacks, type FeedbackRecord } from '../services/feedback';

type Aviso = { msg: string; tone: 'success' | 'error' } | null;
const useAviso = () => {
  const [aviso, setAviso] = useState<Aviso>(null);
  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => {
    setAviso({ msg, tone });
    window.setTimeout(() => setAviso(null), 4500);
  };
  return { aviso, avisar };
};

// ------------------------------------------------------------------ Formulário (usuários)

const FormularioFeedback: React.FC<{ avisar: (m: string, t?: 'success' | 'error') => void }> = ({ avisar }) => {
  const usuario = useNav()?.authUser;
  const perfil = usuario?.perfil;
  const email = String(usuario?.email || usuario?.gmail || '').trim();
  const paginas = useMemo(() => PAGE_DEFS
    .filter(p => p.id !== 'feedback' && canAccessPage(p.id, perfil))
    .map(p => ({ id: p.id as string, label: p.label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')), [perfil]);

  const [tipo, setTipo] = useState<TipoFeedback | ''>('');
  const [pagina, setPagina] = useState('');
  const [impacto, setImpacto] = useState<ImpactoProblema | ''>('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{ tipo: TipoFeedback; emailEnviado: boolean } | null>(null);

  const limpar = () => { setTipo(''); setPagina(''); setImpacto(''); setMensagem(''); setErro(''); setEnviado(null); };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const entrada = { tipo: tipo as TipoFeedback, mensagem, ...(tipo === 'problema' ? { pagina, impacto: impacto as ImpactoProblema } : {}) };
    const msg = erroFeedback(entrada);
    if (msg) { setErro(msg); return; }
    setEnviando(true);
    try {
      const paginaRotulo = pagina === PAGINA_GERAL ? ROTULO_PAGINA_GERAL : paginas.find(p => p.id === pagina)?.label;
      const r = await enviarFeedback({ ...entrada, ...(tipo === 'problema' ? { paginaRotulo } : {}) });
      setEnviado({ tipo: tipo as TipoFeedback, emailEnviado: r.emailEnviado });
    } catch (err: any) {
      avisar(err?.message || 'Não foi possível enviar o feedback.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <Card className="text-center" padding="md">
        <div className="flex flex-col items-center gap-3 py-6">
          <span className="material-symbols-outlined text-[48px] text-green" aria-hidden="true">task_alt</span>
          <h2 className="text-h3 font-bold text-ink">Obrigado pelo seu feedback!</h2>
          <p className="text-sm text-ink-3 max-w-md">
            {enviado.tipo === 'problema'
              ? 'O problema foi registrado e encaminhado ao desenvolvedor. Você será informado por e-mail quando for solucionado.'
              : 'Sua mensagem foi registrada e será lida pela administração do app.'}
            {enviado.emailEnviado && email ? ` Enviamos uma confirmação para ${email}.` : ''}
          </p>
          <Button variant="secondary" icon="add_comment" onClick={limpar}>Enviar outro feedback</Button>
        </div>
      </Card>
    );
  }

  const restante = Math.max(0, MIN_MENSAGEM - mensagem.trim().length);
  const placeholder = tipo === 'problema'
    ? 'O que você fazia, o que esperava que acontecesse e o que aconteceu (mensagem de erro, se houver).'
    : tipo === 'sugestao' ? 'Descreva a sua ideia e como ela ajudaria no seu trabalho.' : 'Conte o que funcionou bem para você.';

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <Card title="1. Sobre o que é o seu feedback?" titleAs="h2">
        <div role="radiogroup" aria-label="Tipo do feedback" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIPOS_FEEDBACK.map(t => {
            const ativo = tipo === t.value;
            return (
              <button key={t.value} type="button" role="radio" aria-checked={ativo}
                onClick={() => { setTipo(t.value); setErro(''); }}
                className={`flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 text-left rounded-xl border-2 p-4 min-h-[44px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${ativo ? 'border-navy bg-surface-2' : 'border-line hover:border-ink-4'}`}>
                <span className={`material-symbols-outlined text-[28px] ${ativo ? 'text-navy' : 'text-ink-3'}`} aria-hidden="true">{t.icon}</span>
                <span>
                  <span className="block text-sm font-bold text-ink">{t.label}</span>
                  <span className="block text-xs text-ink-3">{t.dica}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {tipo === 'problema' && (
        <Card title="2. Onde e com que impacto?" titleAs="h2">
          <div className="space-y-4">
            <Field label="Página em que o problema ocorreu" required>
              {a => (
                <select {...a} value={pagina} onChange={e => { setPagina(e.target.value); setErro(''); }} className={controlClass}>
                  <option value="">Selecione a página…</option>
                  {paginas.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  <option value={PAGINA_GERAL}>{ROTULO_PAGINA_GERAL}</option>
                </select>
              )}
            </Field>
            <ChoiceGroup label="Impacto no seu trabalho" required value={impacto}
              onChange={v => { setImpacto(v); setErro(''); }}
              options={IMPACTOS.map(i => ({ value: i.value, label: i.label.split(' — ')[0] }))} />
            {impacto && <p className="text-xs text-ink-3 -mt-2">{IMPACTOS.find(i => i.value === impacto)?.label.split(' — ')[1]}</p>}
          </div>
        </Card>
      )}

      {tipo && (
        <Card title={`${tipo === 'problema' ? '3' : '2'}. Conte para nós`} titleAs="h2">
          <div className="space-y-4">
            <Field label={tipo === 'problema' ? 'Descreva o problema' : tipo === 'sugestao' ? 'Sua sugestão' : 'Seu elogio'} required
              help={restante > 0 ? `Mínimo de ${MIN_MENSAGEM} caracteres (faltam ${restante}).` : `${mensagem.length}/${MAX_MENSAGEM}`}>
              {a => (
                <textarea {...a} value={mensagem} maxLength={MAX_MENSAGEM} placeholder={placeholder}
                  onChange={e => { setMensagem(e.target.value); setErro(''); }} className={`${a.className} min-h-[140px]`} />
              )}
            </Field>
            <p className="flex items-start gap-2 text-xs text-ink-3">
              <span className="material-symbols-outlined text-[18px] text-ink-4" aria-hidden="true">mail</span>
              {email
                ? `Você receberá uma confirmação em ${email}.`
                : 'Seu cadastro não tem e-mail: o feedback será registrado, mas sem confirmação por e-mail.'}
            </p>
            {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
            <div className="flex justify-end">
              <Button type="submit" icon="send" loading={enviando} className="w-full sm:w-auto">Enviar feedback</Button>
            </div>
          </div>
        </Card>
      )}
    </form>
  );
};

// ------------------------------------------------------------------ Lista (Admin)

const dataDe = (f: FeedbackRecord): string => (f.criadoEm?.toDate ? dataHoraRecife(f.criadoEm.toDate()) : f.criadoEmTexto || '');

const ItemFeedback: React.FC<{ f: FeedbackRecord; avisar: (m: string, t?: 'success' | 'error') => void }> = ({ f, avisar }) => {
  const [salvando, setSalvando] = useState(false);
  const concluido = feedbackConcluido(f);
  const rotulo = f.tipo === 'problema' ? 'Solucionado' : 'Lido';
  const alternar = async () => {
    setSalvando(true);
    try {
      const r = await marcarFeedback(f.id, !concluido);
      if (f.tipo === 'problema' && !concluido) {
        avisar(r.emailEnviado ? `Solucionado. E-mail enviado a ${f.usuario || 'o usuário'}.` : r.semEmail ? 'Solucionado. O usuário não tem e-mail cadastrado.' : 'Solucionado.');
      }
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível atualizar o feedback.', 'error');
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Card as="li" padding="sm" className={concluido ? 'opacity-70' : ''}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-ink">{f.usuario || 'Usuário'}</span>
            <span className="text-xs text-ink-3">{dataDe(f)}</span>
            {f.tipo === 'problema' && f.paginaRotulo && <StatusTag tone="navyOutline">{f.paginaRotulo}</StatusTag>}
            {f.tipo === 'problema' && f.impacto && (
              <StatusTag tone={f.impacto === 'alto' ? 'danger' : f.impacto === 'medio' ? 'attention' : 'neutral'}>Impacto {rotuloImpacto(f.impacto).toLowerCase()}</StatusTag>
            )}
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap break-words">{f.mensagem}</p>
          {(f.email || f.contexto?.tela) && (
            <p className="text-xs text-ink-4 break-all">{[f.email, f.contexto?.tela ? `tela ${f.contexto.tela}` : ''].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <label className="flex items-center gap-2 shrink-0 min-h-[44px] cursor-pointer text-sm font-semibold text-ink">
          <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={concluido} disabled={salvando} onChange={() => { void alternar(); }} />
          {rotulo}
        </label>
      </div>
    </Card>
  );
};

const ListaFeedbacks: React.FC<{ avisar: (m: string, t?: 'success' | 'error') => void }> = ({ avisar }) => {
  const [lista, setLista] = useState<FeedbackRecord[] | null>(null);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<TipoFeedback>('problema');
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  useEffect(() => observarFeedbacks(setLista, () => setErro('Não foi possível carregar os feedbacks.')), []);

  const pendentes = (t: TipoFeedback) => (lista ?? []).filter(f => f.tipo === t && !feedbackConcluido(f)).length;
  const daAba = (lista ?? []).filter(f => f.tipo === aba);
  const visiveis = daAba.filter(f => mostrarConcluidos || !feedbackConcluido(f));
  const concluidos = daAba.length - daAba.filter(f => !feedbackConcluido(f)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <Segmented ariaLabel="Tipo de feedback" value={aba} onChange={setAba} papel="tab" idBase="feedback"
          options={TIPOS_FEEDBACK.map(t => ({ value: t.value, label: t.value === 'problema' ? 'Problemas' : t.value === 'sugestao' ? 'Sugestões' : 'Elogios', icon: t.icon, badge: pendentes(t.value) || undefined, badgeTone: t.value === 'problema' ? 'alerta' : 'neutro' }))} />
        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer text-sm text-ink-3">
          <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={mostrarConcluidos} onChange={e => setMostrarConcluidos(e.target.checked)} />
          Mostrar {aba === 'problema' ? 'solucionados' : 'lidos'}{concluidos ? ` (${concluidos})` : ''}
        </label>
      </div>
      <div id="feedback-painel" role="tabpanel" aria-labelledby={`feedback-aba-${aba}`}>
        {erro ? (
          <p role="alert" className="text-sm text-wine">{erro}</p>
        ) : lista === null ? (
          <p className="text-sm text-ink-3" role="status">Carregando…</p>
        ) : visiveis.length === 0 ? (
          <EmptyState icon="inbox" title={daAba.length ? 'Nada pendente' : 'Nenhum feedback recebido'}
            description={daAba.length ? `Todos os ${aba === 'problema' ? 'problemas foram solucionados' : 'feedbacks foram lidos'}.` : 'Quando os usuários enviarem, eles aparecem aqui.'} />
        ) : (
          <ul className="space-y-3">{visiveis.map(f => <ItemFeedback key={f.id} f={f} avisar={avisar} />)}</ul>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ Página

export const Feedback: React.FC = () => {
  const admin = useNav()?.authUser?.perfil === 'admin';
  const { aviso, avisar } = useAviso();
  return (
    <Container size={admin ? 'data' : 'form'} className="py-6 md:py-8 pt-4 md:pt-8 pb-10">
      <PageHeader
        title="Feedback"
        description={admin
          ? 'Elogios, sugestões e problemas enviados pelos usuários. Marcar um problema como solucionado avisa o usuário por e-mail.'
          : 'Conte o que funcionou bem, sugira melhorias ou relate um problema. Toda mensagem é lida pela administração do app.'}
      />
      {admin ? <ListaFeedbacks avisar={avisar} /> : <FormularioFeedback avisar={avisar} />}
      <Toast message={aviso?.msg ?? null} tone={aviso?.tone} />
    </Container>
  );
};

export default Feedback;
