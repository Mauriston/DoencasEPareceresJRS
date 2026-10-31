// Ficheiro: config/endpoints.ts
// Apps Script do app (CodeConcursos.gs + CodePrincipal.gs): PDFs a partir de templates do Google Docs,
// Drive, e-mails para impressão, Google Agenda, leitura do atestado e minuta de mensagens pelo Gemini.
export const GAS_URL_CONCURSOS = 'https://script.google.com/macros/s/AKfycbx9FDjnQKRhu26z4VQRDRdHnAvKUaIfNaViEjHLHoX1St4sNyri6ppYTrgEg7ne869tnw/exec';

export const APP_CONFIG = {
  drive: {
    raizConcursosId: '1eBTehJDTOPjsgOeP3DjWKbE-iXdIKGos',
    pareceresId: '176YQTOOWXuE78Xul49XYpJsVNyu-eZFi',
  },
  templates: {
    termoRecursoId: '1gVSaakcQJBrFJnF4umFbI_cjR9abCXPjfOyfSUFKnRo',
    termoCientificacaoId: '1uSdvvwxjPDkvGm7kjCrDGaGnPVF3_pDu4rN6C6tJFiI',
    solicitacaoParecerId: '16KIcTgceHNdbTNRe8UeYPjJXn4r_d450Xy61conLO3Q',
    pedidoParecerId: '1jE-3VQ8G2t4JQJ5B7ydedq6oupvsXwo7aPX_AVttMEM',
    solicitacaoExamesId: '1SSAzdWANvfQJx7Sip2-NbqDGAM0cgpVD6Q4Ci9UhGqQ',
  },
  calendar: {
    jrsHnreId: 'c_b103c034ba38b68e447b1ea6ab97b0da658878ebc7daa7535d612f9f7eaed762@group.calendar.google.com'
  }
};

