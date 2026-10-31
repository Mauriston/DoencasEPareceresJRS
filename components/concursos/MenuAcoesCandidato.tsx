// Ficheiro: components/concursos/MenuAcoesCandidato.tsx
// Menu ⋮ de ações de um candidato (desktop): pareceres e exames, registro de eventos, editar e
// limpar a IS (Admin).
import React from 'react';
import { type EstadoConcursoDetalhe } from './useConcursoDetalhe';

export const MenuAcoesCandidato: React.FC<{ s: EstadoConcursoDetalhe }> = ({ s }) => {
  const {
    candidatos, podeSolicitarBase, podeEnviarExames, gerandoSolicitacaoIds, menuAcoes, setMenuAcoes,
    setEventosAlvo, statusPermiteSolicitacao, ehAdmin, temDocumentoGerado, handleEnviarExames,
    handleGerarSolicitacao, handleVerSolicitacao, handleEditarIS, handleLimparIS,
  } = s;
  return (
    <>
      {menuAcoes && (() => {
        const c = candidatos.find(x => x.id === menuAcoes.id);
        if (!c) return null;
        const gerando = gerandoSolicitacaoIds.has(c.id);
        const classeItem = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-left text-navy hover:bg-paper disabled:text-ink-5 disabled:cursor-not-allowed disabled:hover:bg-transparent';
        // Gerar Parecer/Exames só aparecem quando podem ser usados (nunca desabilitados).
        const mostrarGerar = podeSolicitarBase && statusPermiteSolicitacao(c) && !gerando;
        const docsVer = [
          ...c.solicitacoesParecer.map((d, i) => ({ tipo: 'parecer' as const, d, chave: `p${i}` })),
          ...c.solicitacoesExames.map((d, i) => ({ tipo: 'exames' as const, d, chave: `e${i}` })),
        ];
        const mostrarAdmin = ehAdmin;
        return (
          <>
            <div className="fixed inset-0 z-dropdown" onClick={() => setMenuAcoes(null)} />
            <div role="menu" className="fixed z-dropdown w-64 py-1 bg-white rounded-xl border border-line shadow-xl max-h-[70vh] overflow-y-auto" style={{ top: menuAcoes.top, right: menuAcoes.right }}>
              {!mostrarGerar && docsVer.length === 0 && !mostrarAdmin && !podeEnviarExames && (
                <p className="px-4 py-3 text-sm text-ink-3">Nenhuma ação disponível para este candidato agora.</p>
              )}
              {/* Ver os exames transcritos não entra aqui: o botão com badge na coluna Ações já faz isso. */}
              {podeEnviarExames && (
                <>
                  <button type="button" role="menuitem" onClick={() => handleEnviarExames(c)} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">lab_profile</span>
                    <span>Enviar Exames (PDF)</span>
                  </button>
                  {(mostrarGerar || docsVer.length > 0 || mostrarAdmin) && <div className="my-1 border-t border-ink-5" />}
                </>
              )}
              {mostrarGerar && (
                <>
                  <button type="button" role="menuitem" onClick={() => handleGerarSolicitacao('parecer', c)} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                    <span>Gerar Parecer</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleGerarSolicitacao('exames', c)} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">lab_research</span>
                    <span>Gerar Exames</span>
                  </button>
                </>
              )}
              {docsVer.length > 0 && (
                <>
                  {mostrarGerar && <div className="my-1 border-t border-ink-5" />}
                  {docsVer.map(({ tipo, d, chave }) => (
                    <button key={chave} type="button" role="menuitem" onClick={() => handleVerSolicitacao(d)} className={classeItem}>
                      <span className="material-symbols-outlined text-[20px] text-green-700">{tipo === 'parecer' ? 'clinical_notes' : 'lab_panel'}</span>
                      <span className="min-w-0 truncate">{tipo === 'parecer' ? 'Ver Parecer' : 'Ver Exames'} · {d.rotulo}</span>
                    </button>
                  ))}
                </>
              )}
              {mostrarAdmin && (
                <>
                  {(mostrarGerar || docsVer.length > 0) && <div className="my-1 border-t border-ink-5" />}
                  <button type="button" role="menuitem" onClick={() => { setMenuAcoes(null); setEventosAlvo({ id: c.id, nome: c.nome }); }} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">history</span>
                    <span>Registro de Eventos</span>
                  </button>
                  {(c.finalizado || temDocumentoGerado(c)) && <div className="my-1 border-t border-ink-5" />}
                  {c.finalizado && (
                    <button type="button" role="menuitem" onClick={() => handleEditarIS(c)} className={classeItem}>
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                      <span>Editar</span>
                    </button>
                  )}
                  {temDocumentoGerado(c) && (
                    <button type="button" role="menuitem" onClick={() => handleLimparIS(c)} className={`${classeItem} !text-wine-700 hover:!bg-wine-50`}>
                      <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
                      <span>Limpar</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        );
      })()}
    </>
  );
};
