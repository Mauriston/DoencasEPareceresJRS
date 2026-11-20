// Ficheiro: components/home/CardAniversariantes.tsx
// Card "Aniversariantes do mês" da Início (só Admin): usuários com data de nascimento no mês corrente, pelo dia.
// Quem faz aniversário hoje ganha destaque e o botão de enviar a mensagem de parabéns pelo WhatsApp
// (wa.me com o celular do cadastro — utils/aniversarios.ts).
import React, { useEffect, useMemo, useState } from 'react';
import { listUsuarios, type UsuarioRecord } from '../../services/firestoreUsuarios';
import { aniversariantesDoMes, linkWhatsAppParabens, nomeSemPosto } from '../../utils/aniversarios';
import { EmptyState } from '../ui/EmptyState';
import { Secao } from './Secao';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const CardAniversariantes: React.FC<{ hoje: string }> = ({ hoje }) => {
  const [usuarios, setUsuarios] = useState<UsuarioRecord[] | null>(null);
  useEffect(() => {
    let vivo = true;
    listUsuarios().then(u => { if (vivo) setUsuarios(u); }).catch(() => { if (vivo) setUsuarios([]); });
    return () => { vivo = false; };
  }, []);

  const lista = useMemo(() => aniversariantesDoMes(usuarios ?? [], hoje), [usuarios, hoje]);
  const mes = MESES[Number(hoje.slice(5, 7)) - 1] ?? '';

  if (usuarios === null) return null;
  return (
    <Secao id="home-aniversariantes" titulo={<span className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-gold-ink" aria-hidden="true">cake</span>Aniversariantes do mês</span>}>
      {lista.length === 0 ? (
        <EmptyState icon="cake" title="Nenhum aniversariante" description={`Ninguém faz aniversário em ${mes}.`} />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {lista.map(a => {
            const link = a.ehHoje ? linkWhatsAppParabens(a.pessoa.celular, a.pessoa.usuario, a.idade) : null;
            return (
              <li key={a.pessoa.id} className={`flex items-center gap-3 px-4 py-2 min-h-[52px] ${a.ehHoje ? 'bg-thead' : ''}`}>
                <span className={`w-11 shrink-0 text-center tabular-nums text-sm ${a.ehHoje ? 'font-bold text-navy' : 'text-ink-3'}`}>
                  {String(a.dia).padStart(2, '0')}/{hoje.slice(5, 7)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate text-sm ${a.ehHoje ? 'font-bold text-navy' : 'text-ink'}`}>{a.pessoa.usuario}</span>
                  <span className="block text-xs text-ink-3">{a.ehHoje ? `Hoje · ${a.idade} anos` : `${a.idade} anos`}</span>
                </span>
                {a.ehHoje && (link ? (
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
