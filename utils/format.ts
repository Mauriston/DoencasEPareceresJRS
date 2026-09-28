// Ficheiro: utils/format.ts
// Máscaras de exibição/edição compartilhadas entre Usuários (Admin) e Perfil.

/** Formata o NIP no padrão 00.0000.00, a partir de qualquer string com dígitos. */
export const formatNip = (val: string | undefined | null): string => {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 8);
  let masked = digits;
  if (digits.length > 2) masked = digits.slice(0, 2) + '.' + digits.slice(2);
  if (digits.length > 6) masked = digits.slice(0, 2) + '.' + digits.slice(2, 6) + '.' + digits.slice(6);
  return masked;
};

/** Formata o celular no padrão (00) 00000-0000, a partir de qualquer string com dígitos. */
export const formatCelular = (val: string | undefined | null): string => {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
