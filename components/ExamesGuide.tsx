import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './Header';
import { ChevronDown, ChevronRight, CheckCircle2, User, Calendar, FileText, Info, X } from 'lucide-react';
import examesData from '../data/anexoOExamesMinimos.json';

// Anexo O da DGPM-406 (9ª Rev): finalidades de IS agrupadas (Controle
// Periódico, Ingresso...) e, dentro de cada finalidade, exames agrupados
// (Avaliações, Exames laboratoriais...). Fonte: data/anexoOExamesMinimos.json.
interface Exame {
  Exame: string;
  Condicao_Genero: 'Masculino' | 'Feminino' | null;
  Condicao_Idade_Minima: number | null;
  Observacoes: string | null;
}

interface GrupoExame {
  Grupo_Exame: string;
  Exames: Exame[];
}

interface Finalidade {
  Finalidade_Inspecao: string;
  Grupos_Exame: GrupoExame[];
}

interface GrupoFinalidade {
  Grupo_Finalidade_Inspecao: string;
  Finalidades_Inspecao: Finalidade[];
}

const GRUPOS_FINALIDADE = examesData as GrupoFinalidade[];

// Alguns nomes no JSON trazem quebra de linha ("Ingresso SAM / SMV\n(oriundos do meio civil)").
const limparNome = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

const FINALIDADES = GRUPOS_FINALIDADE.flatMap(g =>
  g.Finalidades_Inspecao.map(f => ({ ...f, nome: limparNome(f.Finalidade_Inspecao) }))
);

const FINALIDADE_PADRAO = 'Ingresso SAM / SMV (oriundos do meio civil)';

// Menu suspenso com os grupos de finalidade em sanfona: o clique no grupo
// expande suas finalidades logo abaixo (um grupo aberto por vez) e os demais
// grupos ficam esmaecidos, como nos menus do iOS.
const FinalidadeDropdown: React.FC<{ value: string; onChange: (nome: string) => void }> = ({ value, onChange }) => {
  const [aberto, setAberto] = useState(false);
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  const grupoDoValor = GRUPOS_FINALIDADE.find(g =>
    g.Finalidades_Inspecao.some(f => limparNome(f.Finalidade_Inspecao) === value)
  )?.Grupo_Finalidade_Inspecao ?? null;

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('touchstart', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('touchstart', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const alternar = () => {
    // Ao abrir, já expande o grupo da finalidade selecionada.
    if (!aberto) setGrupoAberto(grupoDoValor);
    setAberto(a => !a);
  };

  return (
    <div ref={raiz} className="relative">
      <button
        id="finalidade-select"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={alternar}
        className="w-full flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 text-gray-800 text-sm md:text-base font-semibold rounded-lg p-3 text-left focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy transition-all font-body shadow-inner"
      >
        <span className="min-w-0">
          {grupoDoValor && <span className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{grupoDoValor}</span>}
          <span className="block leading-snug">{value}</span>
        </span>
        <ChevronDown size={18} className={`text-navy flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute z-30 left-0 right-0 mt-2 max-h-[60vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-xl p-2 animate-fade-in">
          {GRUPOS_FINALIDADE.map(grupo => {
            const nomeGrupo = grupo.Grupo_Finalidade_Inspecao;
            const expandido = grupoAberto === nomeGrupo;
            const esmaecido = grupoAberto !== null && !expandido;
            return (
              <div key={nomeGrupo} className={`transition-opacity ${esmaecido ? 'opacity-40' : ''}`}>
                <button
                  type="button"
                  onClick={() => setGrupoAberto(expandido ? null : nomeGrupo)}
                  aria-expanded={expandido}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl text-sm md:text-base font-bold text-navy hover:bg-gray-100 transition-colors ${expandido ? 'bg-gray-100' : ''}`}
                >
                  <span>{nomeGrupo}</span>
                  {expandido ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                {expandido && (
                  <div role="listbox" className="py-1 pl-2">
                    {grupo.Finalidades_Inspecao.map(f => {
                      const nome = limparNome(f.Finalidade_Inspecao);
                      const ativo = nome === value;
                      return (
                        <button
                          key={nome}
                          type="button"
                          role="option"
                          aria-selected={ativo}
                          onClick={() => { onChange(nome); setAberto(false); }}
                          className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg text-sm md:text-base leading-snug transition-colors ${ativo ? 'bg-navy text-white font-bold' : 'text-gray-700 font-medium hover:bg-gray-50'}`}
                        >
                          <span>{nome}</span>
                          {ativo && <CheckCircle2 size={16} className="flex-shrink-0 text-gold" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ExamesGuideProps {
  onBack?: () => void;
}

export const ExamesGuide: React.FC<ExamesGuideProps> = ({ onBack }) => {
  const [genero, setGenero] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [idade, setIdade] = useState<string>('30');
  const [selectedFinalidade, setSelectedFinalidade] = useState<string>(
    FINALIDADES.some(f => f.nome === FINALIDADE_PADRAO) ? FINALIDADE_PADRAO : FINALIDADES[0].nome
  );
  const [obsModal, setObsModal] = useState<{ exame: string; texto: string } | null>(null);

  const activeInspecao = FINALIDADES.find(f => f.nome === selectedFinalidade);
  const parsedIdade = parseInt(idade, 10) || 0;

  const gruposFiltrados = useMemo(() => {
    if (!activeInspecao) return [];
    return activeInspecao.Grupos_Exame
      .map(g => ({
        nome: g.Grupo_Exame,
        exames: g.Exames.filter(ex => {
          if (ex.Condicao_Genero !== null && ex.Condicao_Genero !== genero) return false;
          if (ex.Condicao_Idade_Minima !== null && parsedIdade < ex.Condicao_Idade_Minima) return false;
          return true;
        }),
      }))
      .filter(g => g.exames.length > 0);
  }, [activeInspecao, genero, parsedIdade]);

  const totalExames = gruposFiltrados.reduce((n, g) => n + g.exames.length, 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Exames Mínimos" onBack={onBack} />

      <div className="flex-1 overflow-auto pb-24">
        <div className="p-4 md:p-6 space-y-4 md:space-y-5 animate-fade-in max-w-3xl mx-auto w-full">
        <div className="text-center mb-1">
          <h2 className="text-xl md:text-2xl font-bold text-navy font-heading leading-tight uppercase">EXAMES MÍNIMOS</h2>
          <p className="text-sm md:text-base text-gray-600 font-body mt-2 leading-snug">
            Exames mínimos por finalidade de IS observando o sexo e a idade de acordo com o Anexo O da DGPM-406.
          </p>
        </div>

        <div id="exames-config-card" className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] md:gap-4 space-y-4 md:space-y-0">
            <div className="flex flex-col space-y-2">
              <span className="text-xs md:text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-1">
                <User size={15} className="text-gold" /> Sexo Biológico:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['Masculino', 'Feminino'] as const).map(g => (
                  <button
                    key={g}
                    id={`gender-btn-${g.toLowerCase()}`}
                    type="button"
                    className={`py-2.5 md:py-3 text-sm md:text-base font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none ${
                      genero === g ? 'bg-navy text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setGenero(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="age-input" className="text-xs md:text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-1">
                <Calendar size={15} className="text-gold" /> Idade (Anos):
              </label>
              <input
                id="age-input"
                type="number"
                min="0"
                max="120"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                placeholder="Idade"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm md:text-base font-semibold rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy font-body shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-xs md:text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-1">
              <FileText size={15} className="text-gold" /> Finalidade da Inspeção:
            </label>
            <FinalidadeDropdown value={selectedFinalidade} onChange={setSelectedFinalidade} />
          </div>
        </div>

        <div id="exams-card" className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
            <h3 className="font-heading font-bold text-navy text-sm md:text-base uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-gold" style={{ fontSize: '22px' }}>
                medical_information
              </span>
              Relação de Exames Mínimos
            </h3>
            <span className="text-xs md:text-sm bg-navy/5 text-navy px-2.5 py-1 rounded-full font-bold font-mono">
              {totalExames} exames
            </span>
          </div>

          {gruposFiltrados.length > 0 ? (
            <div className="flex flex-col space-y-5" id="exams-display-list">
              {gruposFiltrados.map(grupo => (
                <section key={grupo.nome}>
                  <h4 className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    {grupo.nome}
                  </h4>
                  <div className="flex flex-col divide-y divide-gray-100">
                    {grupo.exames.map(ex => {
                      const obs = ex.Observacoes?.trim();
                      return (
                        <div key={ex.Exame} className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-gray-50 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 size={18} className="text-gold flex-shrink-0" />
                            <span className="text-sm md:text-base font-semibold text-navy font-body">{ex.Exame}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(ex.Condicao_Genero || ex.Condicao_Idade_Minima !== null) && (
                              <span className="text-[10px] md:text-xs text-navy bg-navy/5 font-bold px-2 py-0.5 rounded">
                                {ex.Condicao_Genero ?? ''}
                                {ex.Condicao_Genero && ex.Condicao_Idade_Minima !== null ? ' • ' : ''}
                                {ex.Condicao_Idade_Minima !== null ? `≥ ${ex.Condicao_Idade_Minima} anos` : ''}
                              </span>
                            )}
                            {obs && (
                              <button
                                type="button"
                                title="Ver observações"
                                aria-label={`Observações sobre ${ex.Exame}`}
                                onClick={() => setObsModal({ exame: ex.Exame, texto: obs })}
                                className="p-1.5 rounded-lg text-[#050F41] bg-gray-100 hover:bg-[#050F41] hover:text-white transition-colors"
                              >
                                <Info size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 font-body text-sm font-medium" id="no-exams-placeholder">
              Nenhum exame mínimo correspondente aos filtros estabelecidos.
            </div>
          )}
        </div>
        </div>
      </div>

      {obsModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setObsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <Info size={20} className="text-[#FAB932] flex-shrink-0" />
                <h3 className="font-heading font-bold text-sm uppercase truncate">{obsModal.exame}</h3>
              </div>
              <button type="button" onClick={() => setObsModal(null)} aria-label="Fechar" className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Observações</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{obsModal.texto}</p>
              <div className="flex justify-end">
                <button type="button" onClick={() => setObsModal(null)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
