import React, { useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { CheckCircle2, User, Calendar, FileText, Info, X } from './ui/icons';
import examesData from '../data/anexoOExamesMinimos.json';
import { MenuCascata, type GrupoMenu } from './ui/MenuCascata';

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

// Menu de finalidades (Exames mínimos, Inspeções de Saúde, Pareceres): menu em cascata compacto
// (ui/MenuCascata) com os grupos do Anexo O — ou os grupos de quem o usa.
/** Grupo de finalidades acrescentado ao menu por quem o usa (ex.: Pareceres), além dos do Anexo O. `gruposProprios` substitui o Anexo O por inteiro. */
export interface GrupoFinalidadeExtra { nome: string; finalidades: string[] }

export const FinalidadeDropdown: React.FC<{ value: string; onChange: (nome: string) => void; placeholder?: string; erro?: boolean; gruposExtras?: GrupoFinalidadeExtra[]; gruposProprios?: GrupoFinalidadeExtra[]; tamanho?: 'campo' | 'destaque' }> = ({ value, onChange, placeholder = 'Selecione a finalidade', erro, gruposExtras = [], gruposProprios, tamanho }) => {
  const grupos: GrupoMenu[] = useMemo(() => [
    ...(gruposProprios ? [] : GRUPOS_FINALIDADE.map(g => ({ nome: g.Grupo_Finalidade_Inspecao, itens: g.Finalidades_Inspecao.map(f => limparNome(f.Finalidade_Inspecao)) }))),
    ...(gruposProprios ?? gruposExtras).map(g => ({ nome: g.nome, itens: g.finalidades })),
  ].filter(g => g.itens.length > 0), [gruposExtras, gruposProprios]);
  return <MenuCascata id="finalidade-select" grupos={grupos} value={value} onChange={onChange} placeholder={placeholder} erro={erro} tamanho={tamanho} />;
};

export const ExamesGuide: React.FC = () => {
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
    <div className="flex flex-col flex-1">


      <Container size="reading" className="py-6 md:py-8 pb-10 space-y-5">
        <PageHeader title="Exames mínimos" description="Exames mínimos por finalidade de IS observando o sexo e a idade, de acordo com o Anexo O da DGPM-406." />

        <div id="exames-config-card" className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-line flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] md:gap-4 space-y-4 md:space-y-0">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-1">
                <User size={15} className="text-navy" /> Sexo Biológico:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['Masculino', 'Feminino'] as const).map(g => (
                  <button
                    key={g}
                    id={`gender-btn-${g.toLowerCase()}`}
                    type="button"
                    className={`py-2.5 md:py-3 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none ${
                      genero === g ? 'bg-navy text-white shadow-md' : 'bg-thead text-ink hover:bg-line'
                    }`}
                    onClick={() => setGenero(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="age-input" className="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-1">
                <Calendar size={15} className="text-navy" /> Idade (Anos):
              </label>
              <input
                id="age-input"
                type="number"
                min="0"
                max="120"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                placeholder="Idade"
                className="w-full bg-paper border border-line text-navy text-base font-semibold rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy font-body shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-1">
              <FileText size={15} className="text-navy" /> Finalidade da Inspeção:
            </label>
            <FinalidadeDropdown value={selectedFinalidade} onChange={setSelectedFinalidade} tamanho="destaque" />
          </div>
        </div>

        <div id="exams-card" className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-line flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3 flex-wrap gap-2">
            <h3 className="font-heading font-bold text-navy text-base tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-navy" style={{ fontSize: '22px' }}>
                medical_information
              </span>
              Relação de Exames Mínimos
            </h3>
            <span className="text-sm bg-navy/5 text-navy px-2.5 py-1 rounded-full font-bold font-mono">
              {totalExames} exames
            </span>
          </div>

          {gruposFiltrados.length > 0 ? (
            <div className="flex flex-col space-y-5" id="exams-display-list">
              {gruposFiltrados.map(grupo => (
                <section key={grupo.nome}>
                  <h4 className="text-xs font-bold text-ink-3 tracking-wider mb-1 px-1">
                    {grupo.nome}
                  </h4>
                  <div className="flex flex-col divide-y divide-line">
                    {grupo.exames.map(ex => {
                      const obs = ex.Observacoes?.trim();
                      return (
                        <div key={ex.Exame} className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-paper transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 size={18} className="text-navy flex-shrink-0" />
                            <span className="text-base font-semibold text-navy font-body">{ex.Exame}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(ex.Condicao_Genero || ex.Condicao_Idade_Minima !== null) && (
                              <span className="text-xs text-navy bg-navy/5 font-bold px-2 py-0.5 rounded">
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
                                className="p-1.5 rounded-lg text-navy bg-thead hover:bg-navy hover:text-white transition-colors"
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
            <div className="text-center py-8 text-ink-3 font-body text-sm font-medium" id="no-exams-placeholder">
              Nenhum exame mínimo correspondente aos filtros estabelecidos.
            </div>
          )}
        </div>
              </Container>
      

      {obsModal && (
        <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setObsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-navy text-white flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <Info size={20} className="text-gold flex-shrink-0" />
                <h3 className="font-heading font-bold text-sm truncate">{obsModal.exame}</h3>
              </div>
              <button type="button" onClick={() => setObsModal(null)} aria-label="Fechar" className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs font-bold text-ink-3 uppercase tracking-wider">Observações</p>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{obsModal.texto}</p>
              <div className="flex justify-end">
                <button type="button" onClick={() => setObsModal(null)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
