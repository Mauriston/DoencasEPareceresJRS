// Ficheiro: components/home/CardAniversariantes.tsx
// Card "Próximos aniversários" da Início (só Admin): os 4 próximos aniversariantes a partir de hoje (inclusive),
// atravessando a virada do ano. Quem faz aniversário hoje ganha destaque e o botão de enviar a mensagem de
// parabéns pelo WhatsApp (wa.me com o celular do cadastro — utils/aniversarios.ts).
import React, { useEffect, useMemo, useState } from 'react';
import { listUsuarios, type UsuarioRecord } from '../../services/firestoreUsuarios';
import { linkWhatsAppParabens, nomeSemPosto, proximosAniversarios } from '../../utils/aniversarios';
import { EmptyState } from '../ui/EmptyState';
import { Secao } from './Secao';

const QUANTOS = 4;
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const quando = (data: string, dias: number) => {
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  const [a, m, d] = data.split('-').map(Number);
  return `${DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} · em ${dias} dias`;
};

export const CardAniversariantes: React.FC<{ hoje: string }> = ({ hoje }) => {
  const [usuarios, setUsuarios] = useState<UsuarioRecord[] | null>(null);
  useEffect(() => {
    let vivo = true;
    listUsuarios().then(u => { if (vivo) setUsuarios(u); }).catch(() => { if (vivo) setUsuarios([]); });
    return () => { vivo = false; };
  }, []);

  const lista = useMemo(() => proximosAniversarios(usuarios ?? [], hoje, QUANTOS), [usuarios, hoje]);

  if (usuarios === null) return null;
  return (
    <Secao id="home-aniversariantes" titulo={<span className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-gold-ink" aria-hidden="true">cake</span>Próximos aniversários</span>}>
      {lista.length === 0 ? (
        <EmptyState icon="cake" title="Nenhuma data cadastrada" description="Informe a data de nascimento no cadastro dos usuários." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {lista.map(a => {
            const ehHoje = a.dias === 0;
            const link = ehHoje ? linkWhatsAppParabens(a.pessoa.celular, a.pessoa.usuario, a.idade) : null;
            return (
              <li key={a.pessoa.id} className={`flex items-center gap-3 px-4 py-2 min-h-[52px] ${ehHoje ? 'bg-thead' : ''}`}>
                <span className={`w-11 shrink-0 text-center tabular-nums text-sm ${ehHoje ? 'font-bold text-navy' : 'text-ink-3'}`}>
                  {a.data.slice(8, 10)}/{a.data.slice(5, 7)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-bold text-navy">{a.pessoa.usuario}</span>
                  <span className="block text-xs text-ink-3">{quando(a.data, a.dias)} · {a.idade} anos</span>
                </span>
                {ehHoje && (link ? (
                  <a
                    href={link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-full text-navy hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold shrink-0"
                    aria-label={`Enviar parabéns a ${nomeSemPosto(a.pessoa.usuario)} pelo WhatsApp (abre em nova aba)`}
                    title="Enviar parabéns pelo WhatsApp"
                  >
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">send</span>
                  </a>
                ) : <span className="text-xs text-ink-4 shrink-0">Sem celular</span>)}
              </li>
            );
          })}
        </ul>
      )}
    </Secao>
  );
};
