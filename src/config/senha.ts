// Ficheiro: config/senha.ts
// Regras de acesso por NIP: senha inicial padrão e contato para redefinição.
export const SENHA_INICIAL_PADRAO = '123456';

/** WhatsApp do CT Mauriston (Presidente da JRS), usado quando o usuário esquece a senha. */
export const WHATSAPP_REDEFINICAO = '5581986541187';
export const WHATSAPP_REDEFINICAO_EXIBICAO = '(81) 98654-1187';

export const linkWhatsappRedefinicao = (usuario: string): string =>
  `https://wa.me/${WHATSAPP_REDEFINICAO}?text=${encodeURIComponent(`${usuario} precisa redefinir sua senha.`)}`;
