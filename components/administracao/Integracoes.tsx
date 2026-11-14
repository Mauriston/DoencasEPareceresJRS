// Ficheiro: components/administracao/Integracoes.tsx
// Administração › Integrações (auditoria v3, 8b): a conta Google do servidor (antes no topo de Usuários) e o
// estado do Google Agenda e do Apps Script. Só leitura do que o app já sabe — a situação da conta vem do
// servidor (/api/google/situacao); o Apps Script é a reserva configurada em config/endpoints.ts (o app não tem
// uma rota de "saúde" do script, então não há teste de conexão aqui).
import React from 'react';
import { Card } from '../ui/Card';
import { StatusTag } from '../ui/StatusTag';
import { ContaGoogleServidor, type EstadoContaGoogle } from '../usuarios/ContaGoogleServidor';
import { NOME_AGENDA_GOOGLE } from '../../services/agendaGoogleIS';
import { GAS_URL_CONCURSOS } from '../../config/endpoints';

const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="py-2 grid gap-1 @lg:grid-cols-[12rem_minmax(0,1fr)]">
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink min-w-0 break-words">{children}</dd>
  </div>
);

export const Integracoes: React.FC<{ conta: EstadoContaGoogle }> = ({ conta }) => {
  const s = conta.situacao;
  const pelaConta = !!s?.autorizado;
  const scriptConfigurado = /^https:\/\/script\.google\.com\//.test(GAS_URL_CONCURSOS);
  return (
    <div className="space-y-4 @container">
      <ContaGoogleServidor estado={conta} />

      <Card as="section" title={<span className="inline-flex flex-wrap items-center gap-2">Google Agenda {s && <StatusTag tone={pelaConta ? 'success' : 'neutral'}>{pelaConta ? 'Pelo servidor' : 'Pelo Apps Script'}</StatusTag>}</span>}>
        <dl className="divide-y divide-line">
          <Linha rotulo="Agenda">“{NOME_AGENDA_GOOGLE}”, com as IS que têm entrevista marcada; o perito entra como convidado pelo Gmail cadastrado em Usuários.</Linha>
          <Linha rotulo="Quem sincroniza">
            {!s ? 'Consultando…' : pelaConta ? <>O servidor, como <b className="break-all">{s.conta || 'a conta autorizada'}</b>.</> : 'O Apps Script (reserva), até a conta Google do servidor ser autorizada.'}
          </Linha>
          {s?.escopos?.length ? <Linha rotulo="Escopos autorizados"><span className="text-xs text-ink-3 break-all">{s.escopos.join(' · ')}</span></Linha> : null}
        </dl>
      </Card>

      <Card as="section" title={<span className="inline-flex flex-wrap items-center gap-2">Apps Script <StatusTag tone={scriptConfigurado ? 'neutral' : 'attention'}>{scriptConfigurado ? 'Configurado' : 'Endereço ausente'}</StatusTag></span>}>
        <dl className="divide-y divide-line">
          <Linha rotulo="Usado para">PDFs a partir dos modelos do Google Docs, arquivos no Drive, minutas com IA e — enquanto a conta do servidor não estiver autorizada — e-mails de impressão e Google Agenda.</Linha>
          <Linha rotulo="Implantação"><span className="text-xs text-ink-3 break-all">{GAS_URL_CONCURSOS.replace(/^https:\/\//, '').replace(/\/exec$/, '')}</span></Linha>
          <Linha rotulo="Como alterar">O endereço fica no código (config/endpoints.ts): uma nova implantação do script exige publicar o app.</Linha>
        </dl>
      </Card>
    </div>
  );
};
