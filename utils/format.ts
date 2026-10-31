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

/** "CT (RM2-Md) 12.3456.78 FULANO DE TAL" → "FULANO DE TAL" (remove posto e NIP). */
export const extrairNomeInspecionado = (texto: string | undefined | null): string => {
  // Registros antigos ou incompletos podem vir sem o campo: não derruba a tela.
  if (!texto) return '';
  const partes = texto.split(/\d{2}\.\d{4}\.\d{2}/);
  return partes.length > 1 ? partes[1].trim() : texto.trim();
};

/** Formata o CPF no padrão 000.000.000-00. */
export const formatCpf = (val: string | undefined | null): string => {
  const d = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/** Confere os dígitos verificadores do CPF (aceita com ou sem máscara). */
export const cpfValido = (val: string): boolean => {
  const d = val.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
};

/** Identidade militar no padrão 000000-0. */
export const formatIdentidadeMilitar = (val: string | undefined | null): string => {
  const d = String(val || '').replace(/\D/g, '').slice(0, 7);
  return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
};

/** "2024-05-31" → "31/05/2024". */
export const formatDataBr = (iso: string | undefined | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
