import React, { useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { CheckCircle2 } from './ui/icons';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Dialog } from './ui/Dialog';
import { Field } from './ui/Field';
import { Segmented } from './ui/Segmented';
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
  // A página abre com os três campos em branco; a relação de exames só aparece
  // depois de informados sexo, idade e finalidade.
  const [genero, setGenero] = useState<'Masculino' | 'Feminino' | ''>('');
  const [idade, setIdade] = useState<string>('');
  const [selectedFinalidade, setSelectedFinalidade] = useState<string>('');
  const [obsModal, setObsModal] = useState<{ exame: string; texto: string } | null>(null);

  const activeInspecao = FINALIDADES.find(f => f.nome === selectedFinalidade);
  const parsedIdade = parseInt(idade, 10);
  const idadeValida = idade.trim() !== '' && Number.isFinite(parsedIdade) && parsedIdade >= 0 && parsedIdade <= 120;
  const camposPreenchidos = !!genero && idadeValida && !!activeInspecao;

  const gruposFiltrados = useMemo(() => {
    if (!camposPreenchidos || !activeInspecao) return [];
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
  }, [camposPreenchidos, activeInspecao, genero, parsedIdade]);

  const totalExames = gruposFiltrados.reduce((n, g) => n + g.exames.length, 0);

  return (
    <div className="flex flex-col flex-1">
      <Container size="reading" className="py-6 md:py-8 pb-10 space-y-6">
        <PageHeader title="Exames mínimos" description="Exames mínimos por finalidade de IS observando o sexo e a idade, de acordo com o Anexo O da DGPM-406." />

        <Card id="exames-config-card" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px] gap-4">
            <div>
              <p aria-hidden="true" className="block text-xs font-semibold text-ink-3 mb-1">Sexo biológico</p>
              <Segmented
                ariaLabel="Sexo biológico"
                fullWidth
                options={[{ value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }]}
                value={genero}
                onChange={setGenero}
              />
            </div>
            <Field label="Idade (anos)">
              {a => (
                <input
                  {...a}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="120"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  placeholder="Idade"
                />
              )}
            </Field>
          </div>

          <div>
            <label htmlFor="finalidade-select" className="block text-xs font-semibold text-ink-3 mb-1">Finalidade da inspeção</label>
            <FinalidadeDropdown value={selectedFinalidade} onChange={setSelectedFinalidade} />
          </div>

          {!camposPreenchidos && (
            <p id="exames-preencher-aviso" className="text-sm text-ink-3 flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] flex-shrink-0">info</span>
              Informe o sexo, a idade e a finalidade para ver os exames mínimos.
            </p>
          )}
        </Card>

        {camposPreenchidos && (
        <Card
          id="exams-card"
          titleAs="h2"
          title="Relação de exames mínimos"
          actions={<span className="text-sm bg-navy/5 text-navy px-2.5 py-1 rounded-full font-bold tabular-nums">{totalExames} {totalExames === 1 ? 'exame' : 'exames'}</span>}
        >
          {gruposFiltrados.length > 0 ? (
            <div className="flex flex-col gap-6" id="exams-display-list">
              {gruposFiltrados.map(grupo => (
                <section key={grupo.nome}>
                  <h3 className="eyebrow mb-1 px-1">
                    {grupo.nome}
                  </h3>
                  <div className="flex flex-col divide-y divide-line">
                    {grupo.exames.map(ex => {
                      const obs = ex.Observacoes?.trim();
                      return (
                        <div key={ex.Exame} className="flex items-center justify-between gap-3 py-2.5 px-1">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 size={18} className="text-navy flex-shrink-0" />
                            <span className="text-base font-semibold text-navy">{ex.Exame}</span>
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
                              <IconButton
                                icon="info"
                                label={`Observações sobre ${ex.Exame}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => setObsModal({ exame: ex.Exame, texto: obs })}
                              />
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
            <div className="text-center py-8 text-ink-3 text-sm font-medium" id="no-exams-placeholder">
              Nenhum exame mínimo correspondente aos filtros estabelecidos.
            </div>
          )}
        </Card>
        )}
      </Container>

      {obsModal && (
        <Dialog
          title={obsModal.exame} icon="info" size="md" onClose={() => setObsModal(null)}
          footer={<Button variant="secondary" onClick={() => setObsModal(null)}>Fechar</Button>}
        >
          <p className="eyebrow mb-2">Observações</p>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{obsModal.texto}</p>
        </Dialog>
      )}
    </div>
  );
};
