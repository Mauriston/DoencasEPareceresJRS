// Ficheiro: components/ficha/outros/PainelDocumentoGerado.tsx
// Aba Outros da Ficha: um documento gerado na IS (servidor/documentos/is/). "Abrir PDF" abre em NOVA aba.
import React from 'react';
import { CascaPainelFicha } from '../CascaPainelFicha';
import { abrirPdfNovaAba, type RegistroDocumentoIS } from '../../../services/documentosIS';

export const PainelDocumentoGerado: React.FC<{ doc: RegistroDocumentoIS }> = ({ doc }) => (
  <CascaPainelFicha rotulo="Outros" acoes={[{ id: 'abrir', rotulo: 'Abrir PDF', icone: 'open_in_new', onClick: () => abrirPdfNovaAba(doc.pdfUrl) }]}>
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-ink-3">Documento</dt><dd className="font-bold text-ink">{doc.titulo}</dd>
      <dt className="text-ink-3">IS</dt><dd>{doc.is}</dd>
      {doc.resumo && <><dt className="text-ink-3">Resumo</dt><dd>{doc.resumo}</dd></>}
      <dt className="text-ink-3">Gerado em</dt><dd>{doc.criadoEmMs ? new Date(doc.criadoEmMs).toLocaleString('pt-BR') : '—'}</dd>
      {doc.assinanteNome && <><dt className="text-ink-3">Assinado por</dt><dd>{doc.assinanteNome}</dd></>}
      <dt className="text-ink-3">E-mail ao inspecionado</dt><dd>{doc.emailEnviado ? 'Enviado' : 'Não enviado'}</dd>
    </dl>
  </CascaPainelFicha>
);
