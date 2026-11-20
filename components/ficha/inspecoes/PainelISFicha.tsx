// Ficheiro: components/ficha/inspecoes/PainelISFicha.tsx
// Painel principal da aba Inspeções de Saúde da Ficha do inspecionado: o InspecaoDetalhe em casca "inline" (os
// mesmos campos e regras do drawer, sem os dados do inspecionado e sem os cards dos documentos gerados) com a barra
// de ações da ficha (useAcoesISFicha) e os atalhos para as abas dos documentos.
// Permissões próprias da ficha: sem o antigo "Parecer" e o antigo "Exames" (agora "Gerar Documento ▾" e
// "Enviar PDF ▾"); "Gravar entrevista" só com a função inspecoes.gravarEntrevista (perfis da junta) e a aba
// Transcrições habilitada — o clique leva à aba, com o formulário de gravação.
import React from 'react';
import { InspecaoDetalhe } from '../../inspecoes/InspecaoDetalhe';
import { useAcoesISFicha } from './useAcoesISFicha';
import { canUseFeature } from '../../../config/permissions';
import { podeUsarEntrevista } from '../../../config/entrevistas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import type { AbaFicha, EstadoAbaFicha } from '../../../utils/fichaInspecionado';

interface Props {
  is: InspecaoRecord;
  perfil: string | undefined;
  abas: Record<AbaFicha, EstadoAbaFicha>;
  definir: (m: Record<string, string | null>) => void;
  om?: string;
  vinculo?: string;
  feminino?: boolean;
  onAgendar: (is: InspecaoRecord) => void;
  onSituacaoMudou: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const PainelISFicha: React.FC<Props> = ({ is, perfil, abas, definir, om, vinculo, feminino, onAgendar, onSituacaoMudou, onAviso }) => {
  const { acoes, atalhos, dialogos } = useAcoesISFicha({ is, perfil, abas, definir, om, vinculo, feminino, onAgendar, onAviso });
  const gravar = podeUsarEntrevista(perfil) && canUseFeature('inspecoes.gravarEntrevista', perfil) && abas.transcricoes.habilitada;
  return (
    <>
      <InspecaoDetalhe
        casca="inline"
        inspecao={is}
        om={om}
        acoesExtras={acoes}
        atalhosDocumentos={atalhos}
        onGravarEntrevista={gravar
          ? () => definir({ aba: 'transcricoes', reg: `is:${is.id}`, gravar: '1', is: null, sel: null, guia: null, criar: null })
          : null}
        permissoes={{
          editar: canUseFeature('inspecoes.editar', perfil),
          // Minuta, parecer e exames vão pela barra da ficha (Minutar MSG, Gerar Documento ▾, Enviar PDF ▾).
          minuta: false,
          parecer: false,
          entrevista: gravar,
          exames: false,
          reabrir: canUseFeature('inspecoes.reabrir', perfil),
        }}
        onClose={() => { /* inline: não fecha */ }}
        onMinuta={() => { /* pela barra da ficha */ }}
        onSolicitarParecer={() => { /* pela barra da ficha */ }}
        onDuplicarParecer={() => { /* sem cards de parecer no inline */ }}
        onSituacaoMudou={onSituacaoMudou}
        onAviso={onAviso}
      />
      {dialogos}
    </>
  );
};
