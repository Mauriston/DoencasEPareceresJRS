// Ficheiro: components/Configuracoes.tsx
// Configurações gerais do app (só Admin; menu do avatar → Configurações). Seções: e-mails automáticos, turnos dos
// peritos na agenda das IS (config/agendaIS; components/configuracoes/TurnosPeritos.tsx) e testes de e-mail. Ajustes que antes exigiam editar o
// repositório e que valem para todos os perfis. Por ora: os e-mails automáticos (config/emails) — destinatários
// fixos PARA / CC / CCO de cada e-mail, o "Responder para" de todos, as assinaturas do Presidente e do Supervisor e a
// saudações dos e-mails de faltas e do NAC; e os testes de e-mail (dados fictícios, só aos destinatários de teste). O servidor lê
// o documento a cada envio (servidor/email/comum.ts): a mudança vale no próximo e-mail, sem publicar nada.
import React, { useContext, useEffect, useState } from 'react';
import { Page } from './ui/Page';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Toast } from './ui/Toast';
import { NavContext } from '../context/NavContext';
import { ListaEmails } from './configuracoes/ListaEmails';
import { TurnosPeritos } from './configuracoes/TurnosPeritos';
import { observarConfigEmails, salvarConfigEmails } from '../services/configEmails';
import { enviarEmailTeste } from '../services/emailTeste';
import { CONFIG_EMAILS_PADRAO, TIPOS_EMAIL, type ConfigEmails, type DestinatariosEmail, type TipoEmail } from '../config/emails';
import { configIgual, errosConfigEmails } from '../utils/configuracoes';

const CAMPOS: { chave: keyof DestinatariosEmail; rotulo: string }[] = [
  { chave: 'para', rotulo: 'Para' },
  { chave: 'cc', rotulo: 'Cópia (CC)' },
  { chave: 'cco', rotulo: 'Cópia oculta (CCO)' },
];

const Cartao: React.FC<{ titulo: string; subtitulo?: React.ReactNode; acao?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ titulo, subtitulo, acao, className = '', children }) => (
  <section className={`bg-white rounded-xl border border-line p-4 md:p-5 ${className}`}>
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
  const [testando, setTestando] = useState<TipoEmail | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => observarConfigEmails(
    c => { setSalvo(c); setRascunho(r => (r === null ? c : r)); },
    () => setErroCarga('Não foi possível carregar as configurações.'),
  ), []);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  if (!rascunho || !salvo) {
    return (
      <Page size="data" title="Configurações" description="Configurações gerais do app (Admin).">
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

  const testar = async (tipo: TipoEmail) => {
    setTestando(tipo);
    try {
      const r = await enviarEmailTeste(tipo);
      avisar(`E-mail de teste enviado para ${[...r.para, ...r.cc].join(', ')}.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível enviar o e-mail de teste.', 'error');
    } finally {
      setTestando(null);
    }
  };

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
            {/* Dois cartões por linha a partir de telas largas; "Geral" ocupa a linha inteira. */}
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <Cartao titulo="Geral" subtitulo="Valem para todos os e-mails." className="lg:col-span-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Responder para (Reply-To)" required error={erros.responderPara}>
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
                  {t.tipo === 'nac' && (
                    <Field label="Saudação" required error={erros.saudacaoNac} className="mt-4" help="Primeira linha do e-mail (encarregada do NAC).">
                      {a => <input {...a} value={rascunho.saudacaoNac} onChange={e => setRascunho({ ...rascunho, saudacaoNac: e.target.value })} />}
                    </Field>
                  )}
                </Cartao>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-h2 font-bold text-navy mb-1">Agenda das IS — turnos dos peritos</h2>
            <p className="text-sm text-ink-3 mb-4">Horários de atendimento de cada médico perito (antes no botão "Horários" de Inspeções de Saúde). Salvos à parte, em "Salvar turnos".</p>
            <TurnosPeritos onAviso={avisar} />
          </div>

          <div>
            <h2 className="text-h2 font-bold text-navy mb-1">Testes de e-mail</h2>
            <p className="text-sm text-ink-3 mb-4">Envia cada e-mail com dados fictícios, pelos mesmos templates do envio real, só para os destinatários abaixo (sem cópia oculta). O assunto leva "[TESTE]". Nenhuma IS, candidato ou cadastro é alterado.</p>
            <Cartao titulo="Destinatários dos testes" subtitulo="Salve antes de testar se mudar a lista.">
              <div className="grid gap-3 md:grid-cols-2 items-start">
                <div>
                <ListaEmails rotulo="Para" emails={rascunho.testes.para} onChange={l => setRascunho({ ...rascunho, testes: { ...rascunho.testes, para: l } })} />
                  {erros.testesPara && <p role="alert" className="text-xs font-semibold text-wine mt-1">{erros.testesPara}</p>}
                </div>
                <ListaEmails rotulo="Cópia (CC)" emails={rascunho.testes.cc} onChange={l => setRascunho({ ...rascunho, testes: { ...rascunho.testes, cc: l } })} />
              </div>
              <ul className="mt-4 grid md:grid-cols-2 gap-px bg-line rounded-xl border border-line overflow-hidden">
                {TIPOS_EMAIL.map(t => (
                  <li key={t.tipo} className="flex flex-wrap items-center gap-3 px-3 py-2 bg-white">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{t.rotulo}</span>
                      <span className="block text-xs text-ink-3">{t.assunto}</span>
                    </span>
                    <Button variant="secondary" icon="send" loading={testando === t.tipo} disabled={!!testando || alterado} onClick={() => testar(t.tipo)}>Enviar teste</Button>
                  </li>
                ))}
              </ul>
              {alterado && <p className="text-xs text-ink-3 mt-2">Salve as alterações para habilitar os testes.</p>}
            </Cartao>
          </div>

        </div>
      </Page>
    </div>
  );
};
