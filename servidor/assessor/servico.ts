// Ficheiro: servidor/assessor/servico.ts
// Um turno do Assessor IA (POST /api/assessor/conversar — server.ts): lê os dados da IS (contexto.ts), escolhe as
// referências da skill pela finalidade (referencias.ts), chama o modelo (modelo.ts) e devolve a resposta conferida
// (resposta.ts). Nada é gravado aqui: o médico decide o que inserir na IS (botões "Inserir na IS" do app).
// A conversa não é guardada no servidor; os logs não levam o conteúdo (só a auditoria de quem pediu e qual IS).
import type { Firestore } from 'firebase-admin/firestore';
import { carregarContextoIS, montarTextoContexto } from './contexto';
import { carregarReferencias } from './referencias';
import { conversaComDados, montarSistema, normalizarConversa } from './prompt';
import { chamarModeloAssessor } from './modelo';
import { carregarTabelaCid, extrairJson, normalizarResposta, type RespostaAssessor } from './resposta';

import { hojeISO } from '../../utils/dados';

export class ErroAssessor extends Error {
  constructor(public status: number, mensagem: string) { super(mensagem); }
}

export const conversarAssessor = async (db: Firestore, isId: string, conversaBruta: unknown): Promise<RespostaAssessor & { modelo: string }> => {
  if (!/^\d{1,12}$/.test(isId)) throw new ErroAssessor(400, 'IS inválida.');
  const conversa = normalizarConversa(conversaBruta);
  if (!conversa.length || conversa[conversa.length - 1].papel !== 'usuario') throw new ErroAssessor(400, 'Escreva um comando para o Assessor.');
  const hoje = hojeISO();
  const contexto = await carregarContextoIS(db, isId, hoje);
  if (!contexto) throw new ErroAssessor(404, 'IS não encontrada.');
  if (contexto.status === 'tis_assinado' || contexto.status === 'cancelada') throw new ErroAssessor(409, 'Esta IS já foi finalizada.');
  const refs = await carregarReferencias({
    fonte: contexto.regras.map(r => r.fonte).join(', '),
    grupoFinalidade: contexto.grupoFinalidade,
    vinculo: contexto.inspecionado.vinculo,
    tipoServico: contexto.inspecionado.tipoServico,
    servidorCivil: contexto.inspecionado.servidorCivil,
  });
  const saida = await chamarModeloAssessor(montarSistema(refs), conversaComDados(conversa, montarTextoContexto(contexto, hoje)));
  const resposta = normalizarResposta(extrairJson(saida.texto), await carregarTabelaCid(), contexto.finalidades);
  if (saida.cortada) resposta.avisos.push('A resposta da IA foi cortada por ser longa demais: confira se os textos estão completos.');
  return { ...resposta, modelo: saida.modelo };
};
