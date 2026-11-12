// Ficheiro: components/ferias/AfastamentoForm.tsx
// Formulário (só Admin) de nova férias/afastamento ou edição. Documentos (PDF ou imagem, opcionais) vão ao Storage;
// ao anexar, a IA (Firebase AI Logic — services/afastamentoIA.ts) lê o documento, identifica do que se trata e
// preenche o que encontrar (usuário, tipo, início, duração, referência, motivo) para conferência. Data fim e status
// automáticos (utils/afastamentos.ts). Médicos ganham bloqueio na agenda das IS; todos, o evento no Google Agenda.
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import type { UsuarioRecord } from '../../services/firestoreUsuarios';
import {
  criarAfastamento, atualizarAfastamento, enviarArquivoAfastamento, novoIdAfastamento, urlArquivoAfastamento,
  type AfastamentoRecord, type ArquivoAfastamento,
} from '../../services/afastamentos';
import { extrairDadosAfastamento } from '../../services/afastamentoIA';
import {
  TIPOS_AFASTAMENTO, dataFimDe, dataValida, diasEntre, geraBloqueioNaAgenda, rotuloStatus, statusEfetivo,
  type StatusAfastamento, type TipoAfastamento,
} from '../../utils/afastamentos';
import { dataBr } from '../../utils/inspecoes';

interface Props {
  usuarios: UsuarioRecord[];
  /** Ausente = novo. */
  atual?: AfastamentoRecord;
  hoje: string;
  autor: string;
  onClose: () => void;
  onSalvo: (msg: string, tom?: 'success' | 'error') => void;
}

const norm = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(w => w.length > 2);

/** Usuário cujo nome completo mais se parece com o nome lido pela IA (≥ 2 palavras em comum). */
export const casarUsuario = (nome: string, usuarios: Pick<UsuarioRecord, 'id' | 'nome' | 'usuario'>[]): string | null => {
  const alvo = new Set(norm(nome));
  let melhor: { id: string; pontos: number } | null = null;
  usuarios.forEach(u => {
    const pontos = norm(`${u.nome} ${u.usuario}`).filter(w => alvo.has(w)).length;
    if (pontos >= 2 && (!melhor || pontos > melhor.pontos)) melhor = { id: u.id, pontos };
  });
  return melhor ? (melhor as { id: string }).id : null;
};

export const AfastamentoForm: React.FC<Props> = ({ usuarios, atual, hoje, autor, onClose, onSalvo }) => {
  const [usuarioUid, setUsuarioUid] = useState(atual?.usuarioUid ?? '');
  const [tipo, setTipo] = useState<TipoAfastamento>(atual?.tipo ?? 'ferias');
  const [dataInicio, setDataInicio] = useState(atual?.dataInicio ?? '');
  const [duracao, setDuracao] = useState(atual ? String(atual.duracaoDias) : '');
  const [status, setStatus] = useState<StatusAfastamento>(atual?.status === 'confirmada' ? 'confirmada' : 'programada');
  const [referencia, setReferencia] = useState(atual?.referencia ?? '');
  const [motivo, setMotivo] = useState(atual?.motivo ?? '');
  const [arquivos, setArquivos] = useState<ArquivoAfastamento[]>(atual?.arquivos ?? []);
  const [novos, setNovos] = useState<File[]>([]);
  const [lendo, setLendo] = useState(false);
  const [leitura, setLeitura] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [id] = useState(() => atual?.id ?? novoIdAfastamento());

  const usuario = usuarios.find(u => u.id === usuarioUid);
  const duracaoN = Number(duracao);
  const dataFim = dataFimDe(dataInicio, duracaoN);
  const statusAuto = dataFim ? statusEfetivo({ dataInicio, dataFim, status }, hoje) : status;
  const opcoesUsuario = useMemo(() => [...usuarios].sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR')), [usuarios]);

  const lerComIA = async (f: File) => {
    setLendo(true); setLeitura(''); setErro('');
    try {
      const d = await extrairDadosAfastamento(f);
      const preenchidos: string[] = [];
      if (d.tipo && !atual) { setTipo(d.tipo); preenchidos.push('tipo'); }
      if (d.nome) { const u = casarUsuario(d.nome, usuarios); if (u) { setUsuarioUid(u); preenchidos.push('usuário'); } }
      if (d.dataInicio && dataValida(d.dataInicio)) { setDataInicio(d.dataInicio); preenchidos.push('início'); }
      const dias = d.duracaoDias && d.duracaoDias > 0 ? d.duracaoDias
        : d.dataInicio && d.dataFim && dataValida(d.dataInicio) && dataValida(d.dataFim) ? diasEntre(d.dataInicio, d.dataFim) + 1 : 0;
      if (dias > 0) { setDuracao(String(dias)); preenchidos.push('duração'); }
      if (d.referencia) { setReferencia(d.referencia.replace(/\D/g, '').slice(0, 4)); preenchidos.push('referência'); }
      if (d.motivo) { setMotivo(d.motivo); preenchidos.push('motivo'); }
      setLeitura(`${d.resumo ? `${d.resumo}. ` : ''}${preenchidos.length ? `Preenchido pela IA: ${preenchidos.join(', ')} — confira antes de salvar.` : 'A IA não encontrou dados para preencher.'}${d.nome && !preenchidos.includes('usuário') ? ` Nome lido: ${d.nome} (não encontrado entre os usuários da JRS).` : ''}`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível ler o documento.');
    } finally {
      setLendo(false);
    }
  };

  const anexar = (lista: FileList | null) => {
    const fs = Array.from(lista ?? []).filter(f => /^(application\/pdf|image\/)/.test(f.type));
    if (!fs.length) return;
    setNovos(n => [...n, ...fs]);
    // Lê o primeiro documento anexado (os campos continuam editáveis).
    void lerComIA(fs[0]);
  };

  const abrir = async (a: ArquivoAfastamento) => { try { window.open(await urlArquivoAfastamento(a), '_blank', 'noopener'); } catch { setErro('Não foi possível abrir o arquivo.'); } };

  const salvar = async () => {
    const e: Record<string, string> = {};
    if (!usuario) e.usuario = 'Escolha o usuário.';
    if (!dataValida(dataInicio)) e.dataInicio = 'Informe a data de início.';
    if (!Number.isInteger(duracaoN) || duracaoN < 1 || duracaoN > 366) e.duracao = 'Informe a duração em dias (1 a 366).';
    if (tipo === 'ferias' && referencia && !/^\d{4}$/.test(referencia)) e.referencia = 'Ano com 4 dígitos.';
    if (tipo === 'lic_adm' && !motivo.trim()) e.motivo = 'Informe o motivo.';
    setErros(e);
    if (Object.keys(e).length || !usuario) return;
    setSalvando(true); setErro('');
    try {
      const enviados: ArquivoAfastamento[] = [];
      for (const f of novos) enviados.push(await enviarArquivoAfastamento(id, f));
      const dados = {
        usuarioUid: usuario.id, usuario: usuario.usuario, perfil: usuario.perfil, tipo, dataInicio, duracaoDias: duracaoN, status,
        referencia: referencia.trim() || undefined, motivo: motivo.trim() || undefined,
      };
      const r = atual
        ? await atualizarAfastamento(atual, dados, [...arquivos, ...enviados], autor, hoje)
        : await criarAfastamento(id, dados, [...arquivos, ...enviados], autor, hoje);
      const base = `${atual ? 'Afastamento atualizado' : 'Afastamento registrado'}: ${usuario.usuario}, ${dataBr(dataInicio)} a ${dataBr(dataFim)}.`;
      onSalvo(r.agendaSincronizada ? base : `${base} O Google Agenda não foi atualizado agora.`, r.agendaSincronizada ? 'success' : 'error');
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title={atual ? 'Editar férias / afastamento' : 'Nova férias / afastamento'}
      icon="beach_access"
      size="lg"
      onClose={() => { if (!salvando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button icon="save" loading={salvando} disabled={lendo} onClick={salvar}>Salvar</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-paper p-3 space-y-2">
          <p className="text-sm font-semibold text-ink">Documentos (opcional)</p>
          <p className="text-xs text-ink-3">PDF ou foto (CP de férias, portaria, papeleta de LTS…). Ao anexar, a IA lê o documento e preenche os campos.</p>
          <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg border border-navy bg-white text-sm font-bold text-navy cursor-pointer hover:bg-thead">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">upload_file</span>
            Anexar documento
            <input type="file" accept="application/pdf,image/*" multiple className="sr-only" onChange={e => { anexar(e.target.files); e.target.value = ''; }} />
          </label>
          {lendo && <p role="status" className="text-xs font-semibold text-navy flex items-center gap-1"><span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden="true">progress_activity</span>Lendo o documento com IA…</p>}
          {leitura && <p role="status" className="text-xs text-ink-2">{leitura}</p>}
          {(arquivos.length > 0 || novos.length > 0) && (
            <ul className="space-y-1">
              {arquivos.map(a => (
                <li key={a.caminho} className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-wine" aria-hidden="true">picture_as_pdf</span>
                  <button type="button" onClick={() => abrir(a)} className="min-w-0 flex-1 truncate text-left text-blue underline underline-offset-2">{a.nome}</button>
                  <Button variant="ghost" icon="close" onClick={() => setArquivos(l => l.filter(x => x.caminho !== a.caminho))} aria-label={`Remover ${a.nome}`}>Remover</Button>
                </li>
              ))}
              {novos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-navy" aria-hidden="true">draft</span>
                  <span className="min-w-0 flex-1 truncate">{f.name} <span className="text-xs text-ink-3">(enviado ao salvar)</span></span>
                  <Button variant="ghost" icon="auto_awesome" disabled={lendo} onClick={() => lerComIA(f)}>Ler com IA</Button>
                  <Button variant="ghost" icon="close" onClick={() => setNovos(l => l.filter((_, j) => j !== i))} aria-label={`Remover ${f.name}`}>Remover</Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label="Usuário" required error={erros.usuario} help={usuario ? (geraBloqueioNaAgenda(usuario.perfil) ? 'Médico: o período bloqueia a agenda das IS e vai ao Google Agenda.' : 'Secretaria: o período vai ao Google Agenda (sem bloqueio na agenda das IS).') : undefined}>
          {a => (
            <select {...a} value={usuarioUid} onChange={e => setUsuarioUid(e.target.value)}>
              <option value="">Escolha…</option>
              {opcoesUsuario.map(u => <option key={u.id} value={u.id}>{u.usuario}{u.nome ? ` — ${u.nome}` : ''}</option>)}
            </select>
          )}
        </Field>

        <ChoiceGroup<TipoAfastamento> label="Tipo" emLinha value={tipo} onChange={setTipo} options={TIPOS_AFASTAMENTO.map(t => ({ value: t.id, label: t.curto }))} />

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Data de início" required error={erros.dataInicio}>
            {a => <input {...a} type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />}
          </Field>
          <Field label="Duração (dias)" required error={erros.duracao}>
            {a => <input {...a} type="number" inputMode="numeric" min={1} max={366} value={duracao} onChange={e => setDuracao(e.target.value)} />}
          </Field>
          <Field label="Data fim" help="Calculada: início + duração − 1.">
            {a => <input {...a} value={dataFim ? dataBr(dataFim) : ''} readOnly disabled />}
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Status" help={dataFim && statusAuto !== status ? `Pelo período, fica "${rotuloStatus(statusAuto)}" automaticamente.` : 'Vira "Em gozo" no início e "Gozada" depois do fim, automaticamente.'}>
            {a => (
              <select {...a} value={status} onChange={e => setStatus(e.target.value as StatusAfastamento)}>
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
              </select>
            )}
          </Field>
          {tipo === 'ferias' && (
            <Field label="Referência (ano)" error={erros.referencia}>
              {a => <input {...a} inputMode="numeric" maxLength={4} placeholder={hoje.slice(0, 4)} value={referencia} onChange={e => setReferencia(e.target.value.replace(/\D/g, '').slice(0, 4))} />}
            </Field>
          )}
          {tipo === 'lic_adm' && (
            <Field label="Motivo" required error={erros.motivo}>
              {a => <input {...a} value={motivo} onChange={e => setMotivo(e.target.value)} />}
            </Field>
          )}
        </div>

        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
