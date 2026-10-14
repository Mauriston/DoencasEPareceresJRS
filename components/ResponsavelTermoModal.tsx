// Ficheiro: components/ResponsavelTermoModal.tsx
// Modal exibido quando um usuário "user_medicos_mpi" vai gerar o Termo de
// Recurso: só um dos médicos da JRS (perfis user_medicos e admin) pode assinar
// o termo, então o MPI escolhe quem é o responsável pela IS. Cada botão traz o
// avatar e o campo "usuario" do cadastro (ex.: "CT MAURISTON").
import React, { useEffect, useState } from 'react';
import { Avatar } from './Header';
import { listUsuarios, UsuarioRecord } from '../services/firestoreUsuarios';

// Ordem hierárquica pelo prefixo do campo "usuario" (posto); o restante segue a ordem alfabética.
const ORDEM_POSTO = ['CMG', 'CF', 'CC', 'CT', '1T', '2T'];
const rankPosto = (usuario: string) => {
  const idx = ORDEM_POSTO.indexOf((usuario || '').trim().split(/\s+/)[0]?.toUpperCase());
  return idx === -1 ? ORDEM_POSTO.length : idx;
};

interface ResponsavelTermoModalProps {
  candidatoNome: string;
  onSelect: (medico: UsuarioRecord) => void;
  onClose: () => void;
}

export const ResponsavelTermoModal: React.FC<ResponsavelTermoModalProps> = ({ candidatoNome, onSelect, onClose }) => {
  const [medicos, setMedicos] = useState<UsuarioRecord[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listUsuarios()
      .then(lista => {
        const jrs = lista
          .filter(u => u.ativo && (u.perfil === 'user_medicos' || u.perfil === 'admin'))
          .sort((a, b) => rankPosto(a.usuario) - rankPosto(b.usuario) || a.usuario.localeCompare(b.usuario, 'pt-BR'));
        setMedicos(jrs);
      })
      .catch(e => setErro(e?.message || 'Não foi possível carregar a lista de médicos.'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-[#050F41] text-white flex items-center space-x-2">
          <span className="material-symbols-outlined text-[20px] text-[#FAB932]">stethoscope</span>
          <h3 className="font-heading font-bold text-sm uppercase">Médico responsável pela IS</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
            Quem é o médico responsável pela IS de <strong>{candidatoNome}</strong>? Ele constará como signatário do Termo de Recurso.
          </p>

          {erro ? (
            <p className="text-xs md:text-sm text-red-700 font-semibold">{erro}</p>
          ) : !medicos ? (
            <p className="text-xs md:text-sm text-gray-500">Carregando...</p>
          ) : medicos.length === 0 ? (
            <p className="text-xs md:text-sm text-gray-500">Nenhum médico da JRS encontrado.</p>
          ) : (
            <div className="space-y-2">
              {medicos.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#050F41] hover:text-white hover:border-[#050F41] text-[#050F41] transition-colors text-left"
                >
                  <Avatar nome={m.nome} imageProfile={m.imageProfile} size={36} />
                  <span className="text-sm md:text-base font-bold">{m.usuario}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
