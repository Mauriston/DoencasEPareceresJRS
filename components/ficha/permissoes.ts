// Ficheiro: components/ficha/permissoes.ts
// Seções da Ficha do inspecionado por permissão (auditoria v3, 9a — MF1): cada bloco só existe para
// quem pode vê-lo (sem abas fantasmas). Fica fora do componente da página (carregado sob demanda)
// para que listas e detalhes decidam se mostram o link "Abrir ficha".
import { canAccessPage, canUseFeature } from '../../config/permissions';

export interface SecoesFicha {
  inspecoes: boolean;
  pareceres: boolean;
  pericias: boolean;
  /** Cadastro completo (CPF, celular…): quem acessa a página Inspecionados. */
  cadastro: boolean;
  /** Registro de eventos do inspecionado: só o Admin (firestore.rules). */
  eventos: boolean;
}

export const secoesDaFicha = (perfil: string | undefined): SecoesFicha => ({
  inspecoes: canAccessPage('inspecoes', perfil),
  pareceres: canAccessPage('pareceres', perfil),
  pericias: canUseFeature('pericia-menor.historico', perfil),
  cadastro: canAccessPage('militares', perfil),
  eventos: perfil === 'admin',
});

/** A ficha abre para quem vê ao menos uma seção (o cabeçalho mínimo vem junto). */
export const podeAbrirFicha = (perfil: string | undefined): boolean => {
  const s = secoesDaFicha(perfil);
  return s.inspecoes || s.pareceres || s.pericias || s.cadastro;
};
