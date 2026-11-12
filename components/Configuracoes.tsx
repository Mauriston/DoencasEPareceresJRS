// Ficheiro: components/Configuracoes.tsx
// Configurações gerais do app (só Admin; menu do avatar → Configurações). Ajustes que antes exigiam editar o
// repositório e que valem para todos os perfis. Por ora: os e-mails automáticos (config/emails) — destinatários
// fixos PARA / CC / CCO de cada e-mail, o "Responder para" de todos, as assinaturas do Presidente e do Supervisor e a
// saudação do e-mail de faltas. O servidor lê
// o documento a cada envio (servidor/email/comum.ts): a mudança vale no próximo e-mail, sem publicar nada.
import React, { useContext, useEffect, useState } from 'react';
import { Page } from './ui/Page';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Toast } from './ui/Toast';
import { NavContext } from '../context/NavContext';
import { ListaEmails } from './configuracoes/ListaEmails';
import { observarConfigEmails, salvarConfigEmails } from '../services/configEmails';
import { CONFIG_EMAILS_PADRAO, TIPOS_EMAIL, type ConfigEmails, type DestinatariosEmail, type TipoEmail } from '../config/emails';
import { configIgual, errosConfigEmails } from '../utils/configuracoes';

const CAMPOS: { chave: keyof DestinatariosEmail; rotulo: string }[] = [
  { chave: 'para', rotulo: 'Para' },
  { chave: 'cc', rotulo: 'Cópia (CC)' },
  { chave: 'cco', rotulo: 'Cópia oculta (CCO)' },
];

const Cartao: React.FC<{ titulo: string; subtitulo?: React.ReactNode; acao?: React.ReactNode; children: React.ReactNode }> = ({ titulo, subtitulo, acao, children }) => (
  <section className="bg-white rounded-xl border border-line p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-navy">{titulo}</h3>
        {subtitulo && <div className="text-xs text-ink-3 mt-0.5">{subtitulo}</div>}
      </div>
      {acao}
    </div>
    {children}
  </section>
);

export const Configuracoes: React.FC = () => {
  const nav = useContext(NavContext);
  const [salvo, setSalvo] = useState<ConfigEmails | null>(null);
  const [rascunho, setRascunho] = useState<ConfigEmails | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => observarConfigEmails(
    c => { setSalvo(c); setRascunho(r => (r === null ? c : r)); },
    () => setErroCarga('Não foi possível carregar as configurações.'),
  ), []);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  if (!rascunho || !salvo) {
    return (
      <Page size="form" title="Configurações" description="Configurações gerais do app (Admin).">
        <p className={`text-sm ${erroCarga ? 'font-semibold text-wine' : 'text-ink-3'}`}>{erroCarga || 'Carregando…'}</p>
      </Page>
    );
  }

  const alterado = !configIgual(rascunho, salvo);
  const erros = errosConfigEmails(rascunho);
  const temErro = Object.keys(erros).length > 0;
  const setLista = (tipo: TipoEmail, chave: keyof DestinatariosEmail, lista: string[]) =>
    setRascunho(r => r && ({ ...r, destinatarios: { ...r.destinatarios, [tipo]: { ...r.destinatarios[tipo], [chave]: lista } } }));
  const restaurar = (tipo: TipoEmail) =>
    setRascunho(r => r && ({ ...r, destinatarios: { ...r.destinatarios, [tipo]: { ...CONFIG_EMAILS_PADRAO.destinatarios[tipo] } } }));
  const ehPadrao = (tipo: TipoEmail) => JSON.stringify(rascunho.destinatarios[tipo]) === JSON.stringify(CONFIG_EMAILS_PADRAO.destinatarios[tipo]);

  const salvar = async () => {
    if (temErro) return;
    setSalvando(true);
    try {
      await salvarConfigEmails(rascunho, nav?.authUser?.usuario || '');
      setRascunho(rascunho);
      avisar('Configurações salvas. Valem a partir do próximo e-mail enviado.');
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível salvar as configurações.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const acoes = (
    <>
      <Button variant="secondary" icon="undo" disabled={!alterado || salvando} onClick={() => setRascunho(salvo)}>Descartar</Button>
      <Button icon="save" loading={salvando} disabled={!alterado || temErro} onClick={salvar}>Salvar</Button>
    </>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Page size="form" title="Configurações" description="Configurações gerais do app, iguais para todos os perfis. Só o Admin vê e altera." actions={acoes}>
        <div className="space-y-6">
          <div className="flex items-start gap-2 rounded-xl border border-line bg-paper p-3 text-sm text-ink-2">
            <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">info</span>
            <p>O servidor lê estas configurações a cada envio: depois de salvar, a mudança vale no próximo e-mail, sem publicar nada.</p>
          </div>

          <div>
            <h2 className="text-h2 font-bold text-navy mb-1">E-mails automáticos</h2>
            <p className="text-sm text-ink-3 mb-4">Destinatários fixos de cada e-mail. Os destinatários que dependem da IS ou dos usuários são acrescentados automaticamente pelo servidor.</p>
            <div className="space-y-4">
              <Cartao titulo="Geral" subtitulo="Valem para todos os e-mails.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Responder para (Reply-To)" required error={erros.responderPara} className="md:col-span-2">
                    {a => <input {...a} type="email" value={rascunho.responderPara} onChange={e => setRascunho({ ...rascunho, responderPara: e.target.value.trim().toLowerCase() })} />}
                  </Field>
                  <Field label="Presidente da JRS — nome completo" required error={erros.presidenteNome} help="Última assinatura de todos os e-mails.">
                    {a => <input {...a} value={rascunho.assinatura.presidenteNome} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, presidenteNome: e.target.value } })} />}
                  </Field>
                  <Field label="Presidente da JRS — posto" required error={erros.presidentePosto}>
                    {a => <input {...a} value={rascunho.assinatura.presidentePosto} onChange={e => setRascunho({ ...rascunho, assinatura: { ...rascunho.assinatura, presidentePosto: e.target.value } })} />}
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3 mt-4">
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
                <p className="text-xs text-ink-3 mt-3">A primeira assinatura ("Por ordem de:") é a de quem envia o e-mail, com o nome, o posto e o cargo do cadastro em Usuários; não aparece quando quem envia é o Admin. No e-mail interno das IS agendadas (18h ou envio manual), as assinaturas são fixas: Supervisor e Presidente.</p>
              </Cartao>

              {TIPOS_EMAIL.map(t => (
                <Cartao
                  key={t.tipo}
                  titulo={t.rotulo}
                  subtitulo={<>Assunto: <strong className="text-ink-2">{t.assunto}</strong></>}
                  acao={<Button variant="ghost" icon="restart_alt" disabled={ehPadrao(t.tipo)} onClick={() => restaurar(t.tipo)}>Restaurar padrões</Button>}
                >
                  <div className="space-y-3">
                    {CAMPOS.map(c => (
                      <ListaEmails key={c.chave} rotulo={c.rotulo} emails={rascunho.destinatarios[t.tipo][c.chave]} onChange={l => setLista(t.tipo, c.chave, l)} />
                    ))}
                  </div>
                  <p className="text-xs text-ink-3 mt-3"><strong>Acrescentados automaticamente:</strong> {t.dinamicos}</p>
                  {t.tipo === 'faltasHNRe' && (
                    <Field label="Saudação" required error={erros.saudacaoFaltasHNRe} className="mt-4" help="Primeira linha do e-mail (encarregada da Divisão de Pessoal do HNRe).">
                      {a => <input {...a} value={rascunho.saudacaoFaltasHNRe} onChange={e => setRascunho({ ...rascunho, saudacaoFaltasHNRe: e.target.value })} />}
                    </Field>
                  )}
                </Cartao>
              ))}
            </div>
          </div>

        </div>
      </Page>
    </div>
  );
};
