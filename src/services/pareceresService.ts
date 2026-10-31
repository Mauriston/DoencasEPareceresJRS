// Ficheiro: services/pareceresService.ts
// Fachada do domínio Pareceres: reúne o Firestore (firestorePareceres, firestoreQuesitos) e o PDF do
// Pedido de Parecer no Drive/Apps Script (drivePareceres). Os módulos originais continuam válidos;
// telas novas devem importar daqui. A chamada ao Apps Script passa pelo services/apiClient.ts.
export * from './firestorePareceres';
export * from './firestoreQuesitos';
export * from './drivePareceres';
