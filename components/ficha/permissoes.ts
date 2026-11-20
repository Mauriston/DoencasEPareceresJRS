// Ficheiro: components/ficha/permissoes.ts
// Seções da Ficha do inspecionado por permissão (auditoria v3, 9a — MF1): cada bloco só existe para
// quem pode vê-lo (sem abas fantasmas). Fica fora do componente da página (carregado sob demanda)
// para que listas e detalhes decidam se mostram o link "Abrir ficha".
// Abas (reformulação de 16/11/2026): "Inspeções de Saúde" e "Perícias Menores" seguem as páginas/funções de
// origem; as abas novas têm uma função cada em Administração › Perfis e permissões (grupo "Ficha do
// inspecionado"). "Outros" (documentos gerados nas IS) para todos menos user_medicos_geral; "Transcrições" aparece só
// para quem grava entrevista (config/entrevistas.ts) e fica habilitada conforme a função "ficha.transcricoes"
// (por padrão, só o Admin).
import { canAccessPage, canUseFeature } from '../../config/permissions';
import { podeUsarEntrevista } from '../../config/entrevistas';
import { podeVerDocumentosIS } from '../../utils/documentosIS';
import type { AbaFicha, EstadoAbaFicha } from '../../utils/fichaInspecionado';

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

/** "Outros": documentos gerados nas IS (Gerar Documento ▾, exceto Pedido de Parecer) — todos menos user_medicos_geral. */
export const ABA_OUTROS_DISPONIVEL = true;

/** Visibilidade e habilitação de cada aba da ficha para o perfil. */
export const abasDaFicha = (perfil: string | undefined): Record<AbaFicha, EstadoAbaFicha> => {
  const s = secoesDaFicha(perfil);
  const aba = (id: AbaFicha, visivel: boolean, habilitada = visivel): EstadoAbaFicha => ({ id, visivel, habilitada: visivel && habilitada });
  return {
    is: aba('is', s.inspecoes),
    pm: aba('pm', s.pericias),
    // Afastamentos (só leitura): IS e perícias (as duas coleções são legíveis por quem está autenticado).
    afastamentos: aba('afastamentos', canUseFeature('ficha.afastamentos', perfil)),
    // Atestados/relatórios e exames vêm dos PDFs enviados nas IS; pareceres, da coleção de pareceres.
    atestados: aba('atestados', s.inspecoes && canUseFeature('ficha.atestados', perfil)),
    pareceres: aba('pareceres', s.pareceres && canUseFeature('ficha.pareceres', perfil)),
    exames: aba('exames', s.inspecoes && canUseFeature('ficha.exames', perfil)),
    // Guias de exames geradas na abertura das IS (PDF no Storage: só a equipe lê — storage.rules).
    guias: aba('guias', s.inspecoes && canUseFeature('ficha.guias', perfil)),
    emails: aba('emails', canUseFeature('ficha.emails', perfil)),
    mensagens: aba('mensagens', canUseFeature('ficha.mensagens', perfil)),
    outros: aba('outros', s.inspecoes && podeVerDocumentosIS(perfil), ABA_OUTROS_DISPONIVEL),
    transcricoes: aba('transcricoes', podeUsarEntrevista(perfil), canUseFeature('ficha.transcricoes', perfil)),
  };
};
