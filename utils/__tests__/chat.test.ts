import { describe, expect, it } from 'vitest';
import {
  anexoVencido, chaveBanner, conversasComBanner, estaOnline, expiraEm, idConversa, limiteRetencaoAnexo, matrizCompleta,
  nomeArquivoSeguro, outroParticipante, permissaoChat, previaMensagem, situacaoEntrega, textoAviso, tipoAnexo,
  tipoMensagem, totalNaoLidas, usaChat, validarAnexo, TAMANHO_MAX_ANEXO,
} from '../chat';

const DIA = 24 * 60 * 60 * 1000;

describe('texto do aviso (banner e push)', () => {
  it('muda conforme o tipo', () => {
    expect(textoAviso('CT Fulano', 'texto')).toBe('CT Fulano lhe mandou uma mensagem no chat.');
    expect(textoAviso('CT Fulano', 'arquivo')).toBe('CT Fulano lhe mandou um arquivo no chat.');
    expect(textoAviso('CT Fulano', 'imagem')).toBe('CT Fulano lhe mandou uma imagem no chat.');
  });
  it('nome vazio vira "Alguém"', () => expect(textoAviso('  ', 'texto')).toBe('Alguém lhe mandou uma mensagem no chat.'));
  it('tipo da mensagem pelo anexo', () => {
    expect(tipoMensagem('imagem')).toBe('imagem');
    expect(tipoMensagem('pdf')).toBe('arquivo');
    expect(tipoMensagem(null)).toBe('texto');
  });
  it('prévia', () => {
    expect(previaMensagem('', 'imagem')).toBe('Imagem');
    expect(previaMensagem('  oi\n tudo  ', 'texto')).toBe('oi tudo');
    expect(previaMensagem('x'.repeat(100), 'texto')).toHaveLength(80);
  });
});

describe('permissões por perfil', () => {
  it('padrão libera tudo para os perfis conhecidos', () => {
    expect(permissaoChat(null, 'user_secretaria')).toEqual({ enviar: true, receber: true, anexos: true });
    expect(permissaoChat({}, 'admin')).toEqual({ enviar: true, receber: true, anexos: true });
  });
  it('perfil desconhecido não usa o chat', () => {
    expect(usaChat(permissaoChat(null, 'outro'))).toBe(false);
    expect(usaChat(permissaoChat(null, undefined))).toBe(false);
  });
  it('respeita a matriz e sem enviar não há anexo', () => {
    const m = { user_medicos_geral: { enviar: false, anexos: true }, user_secretaria: { anexos: false } };
    expect(permissaoChat(m, 'user_medicos_geral')).toEqual({ enviar: false, receber: true, anexos: false });
    expect(permissaoChat(m, 'user_secretaria')).toEqual({ enviar: true, receber: true, anexos: false });
    expect(usaChat(permissaoChat({ user_medicos: { enviar: false, receber: false } }, 'user_medicos'))).toBe(false);
  });
  it('matriz completa traz os 5 perfis', () => {
    const m = matrizCompleta({ admin: { anexos: false } });
    expect(Object.keys(m)).toHaveLength(5);
    expect(m.admin.anexos).toBe(false);
    expect(m.user_medicos.enviar).toBe(true);
  });
});

describe('conversa', () => {
  it('id determinístico', () => {
    expect(idConversa('b', 'a')).toBe('a_b');
    expect(idConversa('a', 'b')).toBe('a_b');
    expect(outroParticipante('a_b', 'a')).toBe('b');
  });
  it('não lidas e banners', () => {
    const conversas = [
      { id: 'a_b', naoLidas: { a: 2 }, ultimaMensagem: { autor: 'b', tipo: 'texto' as const, emMs: 10 } },
      { id: 'a_c', naoLidas: { a: 1 }, ultimaMensagem: { autor: 'c', tipo: 'imagem' as const, emMs: 20 } },
      { id: 'a_d', naoLidas: { a: 0 }, ultimaMensagem: { autor: 'd', tipo: 'texto' as const, emMs: 30 } },
    ];
    expect(totalNaoLidas(conversas, 'a')).toBe(3);
    expect(conversasComBanner(conversas, 'a', null, new Set()).map(c => c.id)).toEqual(['a_b', 'a_c']);
    expect(conversasComBanner(conversas, 'a', 'a_b', new Set()).map(c => c.id)).toEqual(['a_c']);
    expect(conversasComBanner(conversas, 'a', null, new Set([chaveBanner(conversas[1])])).map(c => c.id)).toEqual(['a_b']);
    // Mensagem mais nova na conversa fechada no X: o banner volta.
    const nova = { ...conversas[1], ultimaMensagem: { ...conversas[1].ultimaMensagem, emMs: 21 } };
    expect(conversasComBanner([nova], 'a', null, new Set([chaveBanner(conversas[1])]))).toHaveLength(1);
  });
});

describe('anexos', () => {
  it('tipos aceitos', () => {
    expect(tipoAnexo('image/png')).toBe('imagem');
    expect(tipoAnexo('application/pdf')).toBe('pdf');
    expect(tipoAnexo('image/gif')).toBeNull();
  });
  it('validação de tipo e tamanho', () => {
    expect(validarAnexo({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validarAnexo({ type: 'text/plain', size: 10 })).toMatch(/PDF/);
    expect(validarAnexo({ type: 'application/pdf', size: TAMANHO_MAX_ANEXO + 1 })).toMatch(/10 MB/);
    expect(validarAnexo({ type: 'application/pdf', size: 0 })).toMatch(/vazio/);
  });
  it('nome seguro', () => {
    expect(nomeArquivoSeguro('Exame de sangue (cópia).pdf')).toBe('Exame_de_sangue_copia_.pdf');
    expect(nomeArquivoSeguro('../../x.pdf')).toBe('x.pdf');
  });
});

describe('retenção dos anexos (7 dias)', () => {
  const agora = Date.UTC(2026, 10, 20, 10);
  it('vence com 7 dias', () => {
    expect(anexoVencido(agora - 7 * DIA, agora)).toBe(true);
    expect(anexoVencido(agora - 7 * DIA + 1, agora)).toBe(false);
    expect(limiteRetencaoAnexo(agora)).toBe(agora - 7 * DIA);
    expect(expiraEm(agora)).toBe(agora + 7 * DIA);
  });
});

describe('online (heartbeat)', () => {
  const agora = 1_000_000_000;
  it('online se a atividade tem menos de 2 min', () => {
    expect(estaOnline(agora - 30_000, agora)).toBe(true);
    expect(estaOnline(agora - 119_999, agora)).toBe(true);
    expect(estaOnline(agora - 120_000, agora)).toBe(false);
    expect(estaOnline(null, agora)).toBe(false);
  });
});

describe('recibo de leitura', () => {
  it('situação', () => {
    expect(situacaoEntrega({ pendente: true }, 'b')).toBe('enviando');
    expect(situacaoEntrega({ lidaPor: ['a'] }, 'b')).toBe('enviada');
    expect(situacaoEntrega({ lidaPor: ['a', 'b'] }, 'b')).toBe('lida');
  });
});
