// Ficheiro: components/usuarios/ContaGoogleServidor.tsx
// Cartão (só Admin, página Usuários) da conta Google que o servidor usa para enviar os e-mails de
// impressão e sincronizar a agenda "JRS/HNRe". Mostra a situação e abre a autorização do Google numa
// nova aba; enquanto a conta não estiver autorizada, o app continua usando o Apps Script.
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { StatusTag } from '../ui/StatusTag';
import { situacaoContaGoogle, urlAutorizacaoGoogle, type SituacaoContaGoogle } from '../../services/googleServidor';

export const ContaGoogleServidor: React.FC = () => {
  const [situacao, setSituacao] = useState<SituacaoContaGoogle | null>(null);
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(false);

  const carregar = useCallback(async () => {
    setErro('');
    try { setSituacao(await situacaoContaGoogle()); } catch (e: any) { setErro(e?.message || 'Não foi possível consultar o servidor.'); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  // Ao voltar da aba do Google, atualiza a situação.
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible') void carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [carregar]);

  const autorizar = async () => {
    setAbrindo(true);
    setErro('');
    // Abre a aba já no clique (bloqueadores de pop-up) e depois aponta para o Google.
    const aba = window.open('about:blank', '_blank');
    try {
      const url = await urlAutorizacaoGoogle();
      if (aba) aba.location.href = url; else window.location.href = url;
    } catch (e: any) {
      aba?.close();
      setErro(e?.message || 'Não foi possível iniciar a autorização.');
    } finally {
      setAbrindo(false);
    }
  };

  const tag = !situacao ? null
    : !situacao.configurado ? <StatusTag tone="neutral">Cliente OAuth não configurado</StatusTag>
    : situacao.autorizado ? <StatusTag tone="success">Autorizada</StatusTag>
    : <StatusTag tone="attention">Não autorizada</StatusTag>;

  return (
    <section className="bg-white p-4 rounded-2xl shadow-sm border border-line/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-navy text-[20px]" aria-hidden="true">mail</span>
          <h2 className="text-sm font-bold text-ink">Conta Google do servidor</h2>
          {tag}
        </div>
        <p className="text-xs text-ink-3">
          {situacao?.autorizado
            ? <>E-mails de impressão e Google Agenda saem pelo servidor como <b className="text-ink break-all">{situacao.conta || 'a conta autorizada'}</b>.</>
            : 'Enquanto a conta não for autorizada, os e-mails de impressão e o Google Agenda continuam pelo Apps Script.'}
        </p>
        {erro && <p className="text-xs text-wine" role="alert">{erro}</p>}
      </div>
      {situacao?.configurado && (
        <Button variant={situacao.autorizado ? 'secondary' : 'primary'} icon="key" loading={abrindo} onClick={autorizar} className="shrink-0">
          {situacao.autorizado ? 'Autorizar de novo' : 'Autorizar conta'}
        </Button>
      )}
    </section>
  );
};
