// Ficheiro: services/periciaMenorService.ts
// Fachada do domínio Perícia Menor: registros no Firestore (firestorePericiasMenores) e a leitura do
// atestado fotografado pelo Gemini (atestadoIA, via Apps Script). Os módulos originais continuam válidos.
import { listUsuarios } from './firestoreUsuarios';
import { canUseFeature } from '../config/permissions';
import { peritosPericiaMenor, type PeritoPericiaMenor } from '../utils/periciaMenorRegras';

export * from './firestorePericiasMenores';
export * from './atestadoIA';

/** Médicos ativos que podem registrar perícia menor, por NIP crescente (select "Perito responsável" do Admin). */
export const carregarPeritosPericiaMenor = async (): Promise<PeritoPericiaMenor[]> =>
  peritosPericiaMenor(await listUsuarios(), perfil => canUseFeature('pericia-menor.novo', perfil));
