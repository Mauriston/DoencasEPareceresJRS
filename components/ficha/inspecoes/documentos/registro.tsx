// Ficheiro: components/ficha/inspecoes/documentos/registro.tsx
// Registro do menu "Gerar Documento ▾" da Ficha (IS): rótulo, ícone, visibilidade (perfil + IS finalizada → só Termo de
// Recurso e Laudo Pericial), habilitação (dica) e o formulário de cada tipo. As regras ficam em utils/documentosIS.ts
// (as mesmas que o servidor confere). Pedido de Parecer não está aqui (abre a aba Pareceres).
import { documentoISVisivel, motivoDocumentoISIndisponivel, ROTULO_DOCUMENTO_IS, type TipoDocumentoIS } from '../../../../utils/documentosIS';
import type { DefinicaoDocumentoIS } from './tipos';
import { FormSolicitacaoExames } from './FormSolicitacaoExames';
import { FormDeclaracaoComparecimento } from './FormDeclaracaoComparecimento';
import { FormTermoRecurso } from './FormTermoRecurso';
import { FormPapeletaDispensa } from './FormPapeletaDispensa';
import { FormLaudoPericial } from './FormLaudoPericial';

const def = (tipo: TipoDocumentoIS, icone: string, Formulario: DefinicaoDocumentoIS['Formulario']): DefinicaoDocumentoIS => ({
  tipo, rotulo: ROTULO_DOCUMENTO_IS[tipo], icone, Formulario,
  visivel: (perfil, is) => documentoISVisivel(tipo, perfil, is),
  indisponivel: is => motivoDocumentoISIndisponivel(tipo, is),
});

/** Ordem do menu. */
export const DOCUMENTOS_IS: DefinicaoDocumentoIS[] = [
  def('solicitacaoExames', 'lab_profile', FormSolicitacaoExames),
  def('papeletaDispensa', 'description', FormPapeletaDispensa),
  def('declaracaoComparecimento', 'how_to_reg', FormDeclaracaoComparecimento),
  def('termoRecurso', 'gavel', FormTermoRecurso),
  def('laudoPericial', 'contract', FormLaudoPericial),
];

export const definicaoDocumentoIS = (tipo: TipoDocumentoIS) => DOCUMENTOS_IS.find(d => d.tipo === tipo)!;
