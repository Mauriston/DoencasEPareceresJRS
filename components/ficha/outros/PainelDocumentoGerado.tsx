// Ficheiro: components/ficha/outros/PainelDocumentoGerado.tsx
// Aba Outros da Ficha: um documento gerado na IS (servidor/documentos/is/). "Abrir PDF" abre em NOVA aba.
// Abaixo dos dados, as páginas do PDF no MESMO visor (e tamanho de página) da aba Guias (PaginasPdf); os bytes
// vêm do repasse do servidor (POST /api/arquivos/baixar — o Storage não libera leitura por script, CORS) e,
// sem ele, da URL de download.
import React, { useEffect, useState } from 'react';
import { CascaPainelFicha } from '../CascaPainelFicha';
import { PaginasPdf } from '../guias/PaginasPdf';
import { baixarDoServidor } from '../../../services/apiClient';
import { caminhoDocumentoIS } from '../../../utils/documentosIS';
import { abrirPdfNovaAba, type RegistroDocumentoIS } from '../../../services/documentosIS';

export const PainelDocumentoGerado: React.FC<{ doc: RegistroDocumentoIS }> = ({ doc }) => {
  const [dados, setDados] = useState<ArrayBuffer | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    setDados(null); setErro('');
    let vivo = true;
    // O id do registro é o mesmo do arquivo (servidor/documentos/is/servico.ts).
    const caminho = doc.isId && doc.tipo ? caminhoDocumentoIS(doc.isId, doc.tipo, doc.id) : '';
    const direto = () => (doc.pdfUrl ? fetch(doc.pdfUrl).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); }) : Promise.reject(new Error('sem url')));
    (caminho ? baixarDoServidor('/api/arquivos/baixar', { caminho }, { timeoutMs: 60_000 }).catch(direto) : direto())
      .then(b => b.arrayBuffer())
      .then(buf => { if (vivo) setDados(buf); })
      .catch(() => { if (vivo) setErro('Não foi possível baixar o PDF do documento.'); });
    return () => { vivo = false; };
  }, [doc.id, doc.isId, doc.tipo, doc.pdfUrl]);

  return (
    <CascaPainelFicha
      titulo={`${doc.titulo} · IS ${doc.is}`} icone="description"
      // Mesma estrutura do painel das Guias (cabeçalho + visor), para as páginas terem o mesmo tamanho.
      subtitulo={[
        doc.criadoEmMs ? `gerado em ${new Date(doc.criadoEmMs).toLocaleString('pt-BR')}` : '',
        doc.assinanteNome ? `assinado por ${doc.assinanteNome}` : '',
        `e-mail ao inspecionado: ${doc.emailEnviado ? 'enviado' : 'não enviado'}`,
        doc.resumo,
      ].filter(Boolean).join(' · ')}
      acoes={[{ id: 'abrir', rotulo: 'Abrir PDF', icone: 'open_in_new', onClick: () => abrirPdfNovaAba(doc.pdfUrl) }]}
    >
      <PaginasPdf dados={dados} erroUrl={erro} rotulo={`Páginas do documento ${doc.titulo} da IS ${doc.is}`} />
    </CascaPainelFicha>
  );
};
