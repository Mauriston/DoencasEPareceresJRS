// Ficheiro: components/usuarios/ContaGoogleServidor.tsx
// Conta Google que o servidor usa para enviar os e-mails de impressão e sincronizar a agenda "JRS/HNRe"
// (só Admin; Administração › Integrações — antes ficava no topo de Usuários). Mostra a situação e abre a
// autorização do Google numa nova aba; enquanto a conta não estiver autorizada, o app continua usando o
// Apps Script. A situação vem de useSituacaoContaGoogle (também usada no resumo da Administração no celular).
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusTag } from '../ui/StatusTag';
import { situacaoContaGoogle, urlAutorizacaoGoogle, type SituacaoContaGoogle } from '../../services/googleServidor';

export interface EstadoContaGoogle {
  situacao: SituacaoContaGoogle | null;
  erro: string;
  carregar: () => Promise<void>;
}

/** Situação da conta Google do servidor; atualiza ao voltar para a aba (depois de autorizar no Google). */
export const useSituacaoContaGoogle = (): EstadoContaGoogle => {
  const [situacao, setSituacao] = useState<SituacaoContaGoogle | null>(null);
  const [erro, setErro] = useState('');
  const carregar = useCallback(async () => {
    setErro('');
    try { setSituacao(await situacaoContaGoogle()); } catch (e: any) { setErro(e?.message || 'Não foi possível consultar o servidor.'); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible') void carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [carregar]);
  return { situacao, erro, carregar };
};

export const tagContaGoogle = (situacao: SituacaoContaGoogle | null): React.ReactNode =>
  !situacao ? null
    : !situacao.configurado ? <StatusTag tone="neutral">Cliente OAuth não configurado</StatusTag>
    : situacao.autorizado ? <StatusTag tone="success">Autorizada</StatusTag>
    : <StatusTag tone="attention">Não autorizada</StatusTag>;

export const ContaGoogleServidor: React.FC<{ estado: EstadoContaGoogle }> = ({ estado }) => {
  const { situacao, erro: erroSituacao } = estado;
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(false);

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

  return (
    <Card
      as="section"
      title={<span className="inline-flex flex-wrap items-center gap-2">Conta Google do servidor {tagContaGoogle(situacao)}</span>}
      actions={situacao?.configurado ? (
        <Button size="sm" variant={situacao.autorizado ? 'secondary' : 'primary'} icon="key" loading={abrindo} onClick={autorizar}>
          {situacao.autorizado ? 'Autorizar de novo' : 'Autorizar conta'}
        </Button>
      ) : undefined}
    >
      <p className="text-sm text-ink-3">
        {!situacao && !erroSituacao ? 'Consultando o servidor…'
          : situacao?.autorizado
            ? <>E-mails de impressão e Google Agenda saem pelo servidor como <b className="text-ink break-all">{situacao.conta || 'a conta autorizada'}</b>.</>
            : 'Enquanto a conta não for autorizada, os e-mails de impressão e o Google Agenda continuam pelo Apps Script.'}
      </p>
      {(erro || erroSituacao) && <p className="text-xs font-semibold text-wine mt-2" role="alert">{erro || erroSituacao}</p>}
    </Card>
  );
};
