import { describe, it, expect } from 'vitest';
import {
  assinanteDoPedido, caminhoPedidoParecer, caminhoRespostaParecer, ehMedicoAssinante, idParecerValido,
  modoCriarParecer, pedidosPendentes, urlDownloadStorage,
} from '../pareceres';
import { caminhoArquivoValido } from '../arquivosPermitidos';
import { URL_STORAGE_LEGADO } from '../../servidor/google/impressao';

const perito = { uid: 'p1', perfil: 'user_medicos', nome: 'PERITO', postoGraduacao: 'CC (Md)', cargo: 'Membro', crmPe: '111', rqe: '22' };

describe('assinanteDoPedido', () => {
  it('quem gera é médico: assina com os próprios dados, mesmo com outro perito na IS', () => {
    const gerador = { uid: 'g1', perfil: 'user_medicos_mpi', nome: 'GERADOR', crmPe: '' };
    expect(assinanteDoPedido(gerador, perito)).toEqual({ assinante: gerador, origem: 'gerador' });
  });
  it('Admin com CRM conta como médico', () => {
    const admin = { uid: 'a1', perfil: 'admin', nome: 'ADMIN', crmPe: '20674' };
    expect(assinanteDoPedido(admin, perito).origem).toBe('gerador');
  });
  it('quem gera não é médico (Admin sem CRM): assina o perito da IS', () => {
    const admin = { uid: 'a1', perfil: 'admin', nome: 'ADMIN', crmPe: '' };
    expect(assinanteDoPedido(admin, perito)).toEqual({ assinante: perito, origem: 'perito' });
  });
  it('sem perito (pedido fora de IS ou IS sem agendamento): quem gera', () => {
    const admin = { uid: 'a1', perfil: 'admin', nome: 'ADMIN' };
    expect(assinanteDoPedido(admin, null).assinante).toBe(admin);
  });
  it('ehMedicoAssinante', () => {
    expect(ehMedicoAssinante({ perfil: 'user_secretaria' })).toBe(false);
    expect(ehMedicoAssinante({ perfil: 'user_medicos' })).toBe(true);
    expect(ehMedicoAssinante({ perfil: 'admin', crmPe: ' 1 ' })).toBe(true);
    expect(ehMedicoAssinante(null)).toBe(false);
  });
});

describe('caminhos e URL do Storage', () => {
  it('pedido e resposta ficam em pareceres/ (repasse do servidor e storage.rules)', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    expect(caminhoPedidoParecer(id)).toBe(`pareceres/${id}.pdf`);
    expect(caminhoRespostaParecer(id)).toBe(`pareceres/${id}-resposta.pdf`);
    expect(caminhoArquivoValido(caminhoPedidoParecer(id))).toBe(true);
    expect(caminhoArquivoValido(caminhoRespostaParecer(id))).toBe(true);
    expect(idParecerValido(id)).toBe(true);
    expect(idParecerValido('../x')).toBe(false);
  });
  it('URL de download no formato do getDownloadURL — aceita pelo e-mail de impressão', () => {
    const url = urlDownloadStorage('jrs-app-web.firebasestorage.app', 'pareceres/abc.pdf', 'tok');
    expect(url).toBe('https://firebasestorage.googleapis.com/v0/b/jrs-app-web.firebasestorage.app/o/pareceres%2Fabc.pdf?alt=media&token=tok');
    expect(URL_STORAGE_LEGADO.test(url)).toBe(true);
  });
});

describe('pedidosPendentes', () => {
  const ts = (ms: number) => ({ toMillis: () => ms });
  const lista = [
    { id: 'c', status: 'solicitado', isId: '10', criadoEm: ts(300) },
    { id: 'a', status: 'solicitado', isId: '10', criadoEm: ts(100) },
    { id: 'b', status: 'concluido', isId: '10', criadoEm: ts(200) },
    { id: 'd', status: 'solicitado', isId: '11', criadoEm: ts(50) },
    { id: 'e', status: 'solicitado', isId: '10', criadoEm: ts(400), resposta: { transcricao: 'x' } },
  ];
  it('só os sem resposta da IS, do mais antigo para o mais recente', () => {
    expect(pedidosPendentes(lista, '10').map(p => p.id)).toEqual(['a', 'c']);
  });
  it('sem IS: todos os pendentes do inspecionado', () => {
    expect(pedidosPendentes(lista, null).map(p => p.id)).toEqual(['d', 'a', 'c']);
  });
});

describe('modoCriarParecer', () => {
  it('só vale na aba Pareceres', () => {
    expect(modoCriarParecer('pareceres', 'pedido')).toBe('pedido');
    expect(modoCriarParecer('pareceres', 'resposta')).toBe('resposta');
    expect(modoCriarParecer('is', 'pedido')).toBeNull();
    expect(modoCriarParecer('pareceres', 'outro')).toBeNull();
    expect(modoCriarParecer('pareceres', null)).toBeNull();
  });
});
