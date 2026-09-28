// Ficheiro: utils/slug.ts
// Normaliza um texto (ex.: "CT MAURISTON") para um slug seguro em URLs/paths
// e e-mails sintéticos (ex.: "ct-mauriston").
export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
