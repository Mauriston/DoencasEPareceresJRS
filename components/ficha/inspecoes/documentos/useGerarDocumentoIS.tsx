// Ficheiro: components/ficha/inspecoes/documentos/useGerarDocumentoIS.tsx
// Fluxo comum de "Gerar Documento ▾": abre o formulário do tipo → ao enviar, ConfirmDialog "Enviar para o e-mail do
// inspecionado?" (Confirmar = gera e envia; Cancelar = gera sem enviar) → servidor → aviso e o PDF em nova aba.
import React, { useState } from 'react';
import { ConfirmDialog } from '../../../ui/Dialog';
import type { ItemMenu } from '../../../ui/MenuAcoes';
import type { InspecaoRecord } from '../../../../services/firestoreInspecoes';
import { abrirPdfNovaAba, gerarDocumentoIS } from '../../../../services/documentosIS';
import type { TipoDocumentoIS } from '../../../../utils/documentosIS';
import { DOCUMENTOS_IS, definicaoDocumentoIS } from './registro';
import type { ContextoDocumentoFicha } from './tipos';

export const useGerarDocumentoIS = (
  is: InspecaoRecord, contexto: ContextoDocumentoFicha, onAviso: (msg: string, tom?: 'success' | 'error') => void,
) => {
  const [aberto, setAberto] = useState<TipoDocumentoIS | null>(null);
  const [pendente, setPendente] = useState<Record<string, unknown> | null>(null);
  const [enviando, setEnviando] = useState(false);

  const itens: ItemMenu[] = DOCUMENTOS_IS.filter(d => d.visivel(contexto.perfil, is)).map(d => {
    const motivo = d.indisponivel(is, contexto);
    return { rotulo: d.rotulo, icone: d.icone, onClick: () => { if (!motivo) setAberto(d.tipo); }, ...(motivo ? { desabilitado: true, dica: motivo } : {}) };
  });

  const gerar = async (enviarEmail: boolean) => {
    if (!aberto || !pendente) return;
    const tipo = aberto;
    setPendente(null);
    setEnviando(true);
    try {
      const r = await gerarDocumentoIS({ isId: is.id, tipo, dados: pendente, enviarEmail });
      setAberto(null);
      abrirPdfNovaAba(r.pdfUrl);
      if (enviarEmail && !r.emailEnviado) onAviso(`${r.titulo} gerado, mas o e-mail não foi enviado: ${r.erroEmail || 'falha no envio'}.`, 'error');
      else onAviso(`${r.titulo} gerado${r.emailEnviado ? ' e enviado ao inspecionado' : ''}.`);
    } catch (e: any) {
      onAviso(e?.message || 'Não foi possível gerar o documento.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const Form = aberto ? definicaoDocumentoIS(aberto).Formulario : null;
  const dialogos = (
    <>
      {Form && (
        <Form is={is} contexto={contexto} enviando={enviando} onEnviar={d => setPendente(d)} onCancelar={() => { if (!enviando) setAberto(null); }} />
      )}
      {pendente && (
        <ConfirmDialog
          title="Enviar por e-mail?" message="Enviar para o e-mail do inspecionado?"
          confirmLabel="Confirmar" cancelLabel="Cancelar"
          onConfirm={() => { void gerar(true); }} onCancel={() => { void gerar(false); }}
        />
      )}
    </>
  );
  return { itens, dialogos };
};
