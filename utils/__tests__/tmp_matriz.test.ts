import { it } from 'vitest';
import fin from '../../public/finalidadesIS.json';
import { destinatariosDaMensagem } from '../minutaMensagemResultado';
const LAUDOS = ['Apto', 'Apto com restrições por 90 dias', 'Incapaz temporariamente, necessitando de 30 dias de LTS', 'Incapaz definitivamente para o SAM', 'Incapaz definitivamente para a especialidade, estando apto para o SAM com restrições'];
it('m', () => {
  const out: string[] = [];
  for (const g of (fin as any).grupos) for (const f of g.finalidades) for (const v of f.vinculos) for (const l of LAUDOS) {
    const d = destinatariosDaMensagem(f.nome, l, { vinculo: v });
    out.push(`${f.nome} | ${v} | ${l} => ${d ? `${d.para} / ${d.info} (${d.regra})` : 'NULL'}`);
  }
  console.log(out.join('\n'));
});
