// Ficheiro: utils/emails.ts
// Regra dos e-mails dos usuários: o e-mail institucional (funcional) é sempre @marinha.mil.br;
// qualquer outro domínio vai no campo "E-mail Google (Gmail)".
export const MSG_EMAIL_INSTITUCIONAL = 'O e-mail institucional deve terminar em @marinha.mil.br. Outro domínio vai no campo E-mail Google (Gmail).';

/** Vazio é aceito (campo opcional); preenchido, só @marinha.mil.br. */
export const emailInstitucionalValido = (email: string | undefined | null): boolean => {
  const e = String(email ?? '').trim();
  return !e || /^[^\s@]+@marinha\.mil\.br$/i.test(e);
};
