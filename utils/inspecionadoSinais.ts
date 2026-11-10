// Ficheiro: utils/inspecionadoSinais.ts
// Converte os "Dados do Inspecionado" lidos de um print do SINAIS (pela IA, services/sinaisIA.ts)
// nos campos do formulário "Cadastrar novo inspecionado" (components/militares/MilitarCadastroForm.tsx),
// usando a tabela de corpos/quadros/postos da MB (public/corposQuadrosMB.json) e a lista de OM.
// Função pura: o que não der para identificar com segurança fica em branco e vira um aviso.
import {
  postosDoVinculo, quadrosDoOficial, especialidadesDaPraca, montarPgq, montarInspecionado,
  type CorposQuadros, type OrganizacaoMilitar, type Vinculo, type SituacaoMilitar,
} from './corposQuadros';
import { dataCivilISO, normalizarNip } from './dados';
import { formatNip } from './format';

/** Campos como aparecem no SINAIS (texto livre lido da imagem). */
export interface DadosSinais {
  nome?: string;
  situacao?: string;
  omSigla?: string;
  posto?: string;
  corpo?: string;
  dataNascimento?: string;
  nip?: string;
  especialidade?: string;
  quadro?: string;
  tipo?: string;
}

export type VinculoForm = Vinculo | 'Inativo';

export interface PreenchimentoInspecionado {
  /** "dependente"/"pensionista": o print não é de militar (o cadastro é na aba Dep/Pens.). */
  tipo: 'militar' | 'dependente' | 'pensionista';
  vinculo: VinculoForm | '';
  situacao: SituacaoMilitar;
  posto: string;
  /** "CORPO|QUADRO" (oficiais). */
  quadroChave: string;
  cpfn: boolean;
  espSigla: string;
  espTexto: string;
  nome: string;
  nip: string;
  omSigla: string;
  omTexto: string;
  dataNascimento: string;
  /** O que não foi possível preencher (para o usuário completar). */
  avisos: string[];
}

/** Minúsculas, sem acento, ordinais por extenso viram número e só letras/dígitos. */
const chave = (t: string | undefined): string => (t || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\bprimeir[oa]\b/g, '1').replace(/\bsegund[oa]\b/g, '2').replace(/\bterceir[oa]\b/g, '3')
  .replace(/[º°ª]/g, '').replace(/[^a-z0-9]/g, '');

/** Sem o prefixo de temporário/inativo ("RM2-EF" → "EF"). */
const semRm = (sigla: string) => sigla.replace(/^RM\d-/i, '');

const TEMPORARIOS = new Set(['cprm', 'corm']);

export const preencherInspecionadoDoSinais = (
  d: DadosSinais, cq: CorposQuadros, oms: OrganizacaoMilitar[],
): PreenchimentoInspecionado => {
  const avisos: string[] = [];
  const sit = chave(d.situacao);
  const tipoTxt = chave(d.tipo);
  const tipo: PreenchimentoInspecionado['tipo'] =
    /pension/.test(sit) || /pension/.test(tipoTxt) ? 'pensionista'
      : /dependent/.test(sit) || /dependent/.test(tipoTxt) ? 'dependente' : 'militar';

  // Vínculo: inativo (reserva/reformado) pela situação; temporário pelo corpo (CPRM/CORM); senão carreira.
  const corpoChave = chave(d.corpo);
  const temporario = TEMPORARIOS.has(corpoChave) || /reservadamarinha/.test(corpoChave);
  let vinculo: VinculoForm | '' = '';
  let situacao: SituacaoMilitar = '';
  if (/reform/.test(sit)) { vinculo = 'Inativo'; situacao = 'Refº'; }
  else if (/reserva|inativ|rm1/.test(sit)) { vinculo = 'Inativo'; situacao = 'RM1'; }
  else if (tipo === 'militar') vinculo = temporario ? 'Temporário' : 'Carreira';
  const vinculoTabela: Vinculo | '' = vinculo === 'Inativo' ? 'Carreira' : vinculo;

  // Posto: pela sigla ou pelo nome por extenso ("Marinheiro-Recruta" = "Marinheiro Recruta").
  const postoChave = chave(d.posto);
  const disponiveis = vinculoTabela ? postosDoVinculo(cq, vinculoTabela) : [];
  const posto = disponiveis.find(p => chave(p) === postoChave)
    ?? disponiveis.find(p => chave(cq.postos[p]?.nome) === postoChave)
    ?? '';
  if (d.posto && !posto && tipo === 'militar') avisos.push(`Posto "${d.posto}" não identificado: escolha na lista.`);
  const categoria = posto ? cq.postos[posto]?.categoria : undefined;

  // Oficial: quadro pela sigla ou pelo nome (ex.: "Md", "Médicos", "Quadro de Médicos").
  let quadroChave = '';
  if (categoria === 'Oficial' && vinculoTabela) {
    const opcoes = quadrosDoOficial(cq, vinculoTabela, posto);
    const q = chave(d.quadro);
    const achado = opcoes.length === 1 ? opcoes[0]
      : q ? (opcoes.find(o => chave(o.quadro.sigla) === q)
        ?? opcoes.find(o => chave(semRm(o.quadro.sigla)) === q)
        ?? opcoes.find(o => chave(o.quadro.nome) === q || chave(o.quadro.nome).endsWith(q) || q.endsWith(chave(o.quadro.nome).replace(/^quadrode/, ''))))
        : undefined;
    if (achado) quadroChave = `${achado.corpo.sigla}|${achado.quadro.sigla}`;
    else avisos.push(d.quadro ? `Quadro "${d.quadro}" não identificado: escolha na lista.` : 'Quadro não informado no print: escolha na lista.');
  }

  // Praça: CPFN pelo corpo; especialidade pela sigla (com ou sem "RM2-") ou pelo nome.
  const cpfn = categoria === 'Praça' && corpoChave === 'cpfn';
  let espSigla = '';
  let espTexto = '';
  if (categoria === 'Praça' && vinculoTabela) {
    const lista = especialidadesDaPraca(cq, vinculoTabela, posto, cpfn);
    const e = chave(d.especialidade);
    if (lista.length > 0 && e) {
      const achada = lista.find(x => chave(x.sigla) === e) ?? lista.find(x => chave(semRm(x.sigla)) === e) ?? lista.find(x => chave(x.nome) === e);
      if (achada) { espSigla = achada.sigla; espTexto = `${achada.sigla} — ${achada.nome}`; }
      else { espTexto = d.especialidade || ''; avisos.push(`Especialidade "${d.especialidade}" não identificada: escolha na lista.`); }
    } else if (lista.length > 0) avisos.push('Especialidade não informada no print: escolha na lista.');
  }

  // OM: pela sigla exata na lista de OM.
  const omLida = (d.omSigla || '').trim();
  const om = oms.find(o => chave(o.sigla) === chave(omLida));
  if (omLida && !om) avisos.push(`OM "${omLida}" não encontrada na lista: escolha a OM.`);

  const nipDigitos = normalizarNip(d.nip || '');
  if (d.nip && nipDigitos.length !== 8) avisos.push('NIP ilegível no print: confira.');

  return {
    tipo, vinculo, situacao, posto, quadroChave, cpfn, espSigla, espTexto,
    nome: (d.nome || '').replace(/\s+/g, ' ').trim().toUpperCase(),
    nip: nipDigitos.length === 8 ? formatNip(nipDigitos) : '',
    omSigla: om?.sigla || '',
    omTexto: om ? `${om.sigla} — ${om.nome}` : omLida,
    dataNascimento: dataCivilISO(d.dataNascimento || '') || '',
    avisos,
  };
};

/**
 * Cadastro pronto para gravar a partir do preenchimento (IS por foto: inspecionado ainda não cadastrado).
 * Null quando falta algo que o formulário exigiria (vínculo, posto, quadro/especialidade, nome, NIP, OM),
 * quando houve aviso, ou quando a OM é o HNRe (que pede as informações adicionais): nesses casos o
 * cadastro abre preenchido para o usuário completar.
 */
export const militarDoPreenchimento = (p: PreenchimentoInspecionado, cq: CorposQuadros): {
  om: string; temporario: boolean; pgq: string; nip: string; nome: string; inspecionado: string;
  email: string; ativo: boolean; celular: string; dataNascimento: string; rm1: boolean; refo: boolean;
} | null => {
  if (p.tipo !== 'militar' || p.avisos.length > 0 || !p.vinculo || !p.posto || !p.nome || !p.nip) return null;
  if (p.vinculo === 'Inativo' && !p.situacao) return null;
  if (!p.omSigla && !p.situacao) return null;
  if (p.omSigla.trim().toUpperCase() === 'HNRE') return null;
  const vinculoTabela: Vinculo = p.vinculo === 'Inativo' ? 'Carreira' : p.vinculo;
  const categoria = cq.postos[p.posto]?.categoria;
  if (!categoria) return null;
  const [corpoSigla = '', quadroSigla = ''] = p.quadroChave.split('|');
  if (categoria === 'Oficial' && !p.quadroChave) return null;
  if (categoria === 'Praça' && !p.espSigla && especialidadesDaPraca(cq, vinculoTabela, p.posto, p.cpfn).length > 0) return null;
  const pgq = montarPgq(categoria, p.posto, quadroSigla, corpoSigla, p.espSigla, p.situacao);
  return {
    om: p.omSigla, temporario: p.vinculo === 'Temporário', pgq, nip: p.nip, nome: p.nome,
    inspecionado: montarInspecionado(pgq, p.nip, p.nome), email: '', ativo: true, celular: '',
    dataNascimento: p.dataNascimento, rm1: p.situacao === 'RM1', refo: p.situacao === 'Refº',
  };
};
