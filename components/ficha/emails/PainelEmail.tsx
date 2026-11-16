// Ficheiro: components/ficha/emails/PainelEmail.tsx
// Ficha do inspecionado › aba Emails: painel principal de UM e-mail enviado.
//   cabeçalho (CascaPainelFicha): tipo do e-mail e "dd/mm/aaaa hh:mm · por fulano";
//   corpo: os metadados (assunto, para, cc, IS, anexo — só o nome; o arquivo não é exibido) e o e-mail COMO SAIU —
//   o HTML gravado no envio (emails_enviados/{id}/conteudo/corpo, lido ao abrir) num <iframe sandbox srcdoc>
//   SEM scripts (sandbox sem allow-scripts nem allow-same-origin + CSP no documento — utils/emailsEnviados.ts →
//   htmlSeguroParaIframe), com a altura ajustável (Compacta · Média · Grande; no computador, também arrastando
//   a borda inferior). HTML omitido por tamanho: o texto simples. Registro antigo (sem conteúdo): só os
//   metadados e a nota. Sem barra de ações.
import React, { useEffect, useMemo, useState } from 'react';
import { StatusTag } from '../../ui/StatusTag';
import { CascaPainelFicha } from '../CascaPainelFicha';
import { lerCorpoEmail } from '../../../services/emailsEnviados';
import { htmlSeguroParaIframe, type CorpoEmailEnviado, type ItemEmailFicha } from '../../../utils/emailsEnviados';
import { dataHoraDoEnvio } from '../../../utils/historicoEmailsIS';

const ALTURAS = [
  { id: 'p', rotulo: 'Compacta', px: 360 },
  { id: 'm', rotulo: 'Média', px: 640 },
  { id: 'g', rotulo: 'Grande', px: 1000 },
] as const;

const Dado: React.FC<{ rotulo: string; children?: React.ReactNode; largo?: boolean }> = ({ rotulo, children, largo }) => (
  <div className={largo ? 'col-span-2' : undefined}>
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words">{children || '—'}</dd>
  </div>
);

const Nota: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-3">
    <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">info</span>
    <span>{children}</span>
  </p>
);

export const PainelEmail: React.FC<{ item: ItemEmailFicha }> = ({ item }) => {
  const [corpo, setCorpo] = useState<CorpoEmailEnviado | null | undefined>(item.conteudoId ? undefined : null);
  const [erro, setErro] = useState(false);
  const [altura, setAltura] = useState<number>(ALTURAS[1].px);

  useEffect(() => {
    setErro(false);
    if (!item.conteudoId) { setCorpo(null); return; }
    setCorpo(undefined);
    let vivo = true;
    lerCorpoEmail(item.conteudoId)
      .then(c => { if (vivo) setCorpo(c); })
      .catch(() => { if (vivo) { setCorpo(null); setErro(true); } });
    return () => { vivo = false; };
  }, [item.conteudoId]);

  const srcDoc = useMemo(() => (corpo?.html ? htmlSeguroParaIframe(corpo.html) : ''), [corpo]);
  const quando = dataHoraDoEnvio(item.enviadoEmMs);
  const por = item.usuario ? `por ${item.usuario}` : item.legado ? 'registro anterior ao histórico' : '';

  return (
    <CascaPainelFicha
      titulo={item.rotulo} icone="mail"
      tituloExtra={item.legado ? <StatusTag tone="muted" dot={false}>Registro antigo</StatusTag> : undefined}
      subtitulo={[quando, por].filter(Boolean).join(' · ')}
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Dado rotulo="Assunto" largo>{item.assunto}</Dado>
          <Dado rotulo="Para" largo>{item.para.length ? item.para.join(', ') : 'Destinatários da configuração'}</Dado>
          {item.cc.length > 0 && <Dado rotulo="Cc" largo>{item.cc.join(', ')}</Dado>}
          <Dado rotulo="IS">{item.numerosIS.length ? item.numerosIS.join(', ') : ''}</Dado>
          <Dado rotulo="Enviado por">{item.nomeUsuario || item.usuario}</Dado>
          {item.anexo && <Dado rotulo="Anexo" largo>{item.anexo} <span className="text-ink-3">(não exibido)</span></Dado>}
        </dl>

        {corpo === undefined && (
          <div className="flex items-center gap-2 text-sm text-ink-3" role="status">
            <span className="w-4 h-4 border-2 border-line border-t-navy rounded-full animate-spin" aria-hidden="true" />
            Carregando o e-mail…
          </div>
        )}
        {corpo === null && (
          <Nota>
            {erro ? 'Não foi possível carregar o conteúdo deste e-mail.'
              : 'Este registro é anterior à gravação do conteúdo dos e-mails: só os dados do envio estão disponíveis.'}
          </Nota>
        )}
        {corpo && srcDoc && (
          <section aria-label="E-mail como foi enviado" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink-3">E-mail como foi enviado</h3>
              <div role="group" aria-label="Altura da visualização" className="inline-flex rounded-lg border border-line overflow-hidden">
                {ALTURAS.map(a => (
                  <button key={a.id} type="button" onClick={() => setAltura(a.px)} aria-pressed={altura === a.px}
                    className={`px-3 min-h-[36px] text-xs font-semibold ${altura === a.px ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-thead'}`}>
                    {a.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <div key={altura} className="rounded-lg border border-line bg-white overflow-hidden"
              style={{ height: altura, minHeight: 240, resize: 'vertical' }}>
              <iframe
                title={`E-mail: ${item.assunto || item.rotulo}`}
                srcDoc={srcDoc}
                // Sem allow-scripts e sem allow-same-origin: nenhum script roda e o documento não alcança o app.
                // Links abrem em outra aba (base target=_blank), fora do sandbox.
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                className="w-full h-full block bg-white"
              />
            </div>
          </section>
        )}
        {corpo && !srcDoc && (
          <>
            {corpo.htmlOmitido && <Nota>O HTML deste e-mail era grande demais para ser guardado: segue o texto simples enviado junto.</Nota>}
            {corpo.texto
              ? <pre className="whitespace-pre-wrap break-words rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink font-sans">{corpo.texto}</pre>
              : !corpo.htmlOmitido && <Nota>Sem conteúdo gravado para este e-mail.</Nota>}
          </>
        )}
        {corpo?.textoCortado && !srcDoc && <p className="text-xs text-ink-3">O texto foi cortado no limite de gravação.</p>}
      </div>
    </CascaPainelFicha>
  );
};
